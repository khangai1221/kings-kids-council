-- =============================================================================
-- 0012: suggestions and feedback (with anonymous-to-council identity split)
-- =============================================================================

create table public.suggestion_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.suggestion_categories (key, label, sort_order) values
  ('events', 'Events', 1),
  ('clubs', 'Clubs', 2),
  ('school_facilities', 'School facilities', 3),
  ('student_life', 'Student life', 4),
  ('academic_environment', 'Academic environment', 5),
  ('cafeteria', 'Cafeteria', 6),
  ('community_service', 'Community service', 7),
  ('wellbeing', 'Wellbeing', 8),
  ('other', 'Other', 9);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.suggestion_categories (id) on delete set null,
  subject text not null,
  message text not null,
  proposed_solution text,
  attachment_file_id uuid,
  identity_mode public.suggestion_identity_mode not null default 'identified',
  student_id uuid references public.profiles (id) on delete set null,
  status public.suggestion_status not null default 'received',
  assigned_to uuid references public.profiles (id) on delete set null,
  is_published_to_ideas_board boolean not null default false,
  published_summary text,
  internal_tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (identity_mode = 'identified' and student_id is not null)
    or (identity_mode = 'anonymous_to_council')
  )
);

create index idx_suggestions_status on public.suggestions (status);
create index idx_suggestions_category on public.suggestions (category_id);

-- Deliberately isolated table with its own, much stricter RLS (see RLS
-- migration): only teacher_advisor/super_admin may ever select from this.
create table public.suggestion_identity_mappings (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null unique references public.suggestions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.suggestion_replies (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  author_type public.suggestion_author_type not null,
  author_id uuid references public.profiles (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create table public.suggestion_internal_notes (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table public.suggestion_status_history (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  from_status public.suggestion_status,
  to_status public.suggestion_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create trigger trg_suggestions_updated_at before update on public.suggestions for each row execute function public.set_updated_at();

create or replace function public.log_suggestion_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.suggestion_status_history (suggestion_id, from_status, to_status, changed_by)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, public.current_profile_id());
  end if;
  return new;
end;
$$;

create trigger trg_log_suggestion_status_change
  after insert or update of status on public.suggestions
  for each row execute function public.log_suggestion_status_change();

-- ---------------------------------------------------------------------------
-- Submission RPC: for anonymous_to_council suggestions, the suggestion row
-- and the identity mapping are written in one transaction so the two can
-- never drift apart.
-- ---------------------------------------------------------------------------
create or replace function public.submit_suggestion(
  p_category_id uuid,
  p_subject text,
  p_message text,
  p_proposed_solution text,
  p_attachment_file_id uuid,
  p_identity_mode public.suggestion_identity_mode
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_suggestion_id uuid;
begin
  v_student_id := public.current_profile_id();
  if v_student_id is null then
    raise exception 'You must be signed in to submit a suggestion.' using errcode = '28000';
  end if;

  insert into public.suggestions (category_id, subject, message, proposed_solution, attachment_file_id, identity_mode, student_id)
  values (
    p_category_id, p_subject, p_message, p_proposed_solution, p_attachment_file_id, p_identity_mode,
    case when p_identity_mode = 'identified' then v_student_id else null end
  )
  returning id into v_suggestion_id;

  if p_identity_mode = 'anonymous_to_council' then
    insert into public.suggestion_identity_mappings (suggestion_id, student_id)
    values (v_suggestion_id, v_student_id);
  end if;

  return v_suggestion_id;
end;
$$;

grant execute on function public.submit_suggestion(uuid, text, text, text, uuid, public.suggestion_identity_mode) to authenticated;

-- Reveals the identity behind an anonymous-to-council suggestion. Requires
-- the `suggestions.manage_restricted` capability and always writes an audit
-- log row — the caller (server action) supplies a human reason.
create or replace function public.reveal_suggestion_identity(p_suggestion_id uuid, p_reason text)
returns table (student_id uuid, display_name text, school_email citext)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_actor_role text;
begin
  if not public.has_capability('suggestions.manage_restricted') then
    raise exception 'Not authorized to view restricted suggestion identities.' using errcode = 'insufficient_privilege';
  end if;

  v_actor := public.current_profile_id();
  select role::text into v_actor_role from public.profiles where id = v_actor;

  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, reason)
  values (v_actor, v_actor_role, 'suggestion_identity_access', 'suggestion', p_suggestion_id, p_reason);

  return query
    select p.id, p.display_name, p.school_email
    from public.suggestion_identity_mappings sim
    join public.profiles p on p.id = sim.student_id
    where sim.suggestion_id = p_suggestion_id;
end;
$$;

grant execute on function public.reveal_suggestion_identity(uuid, text) to authenticated;

-- SELECT stays grantable: the original anonymous submitter is allowed to see
-- their *own* mapping row (RLS policy in the RLS migration restricts this to
-- student_id = current_profile_id()). Everyone else must go through
-- reveal_suggestion_identity(), which is audited.
revoke insert, update, delete on public.suggestion_identity_mappings from authenticated, anon;

comment on function public.reveal_suggestion_identity(uuid, text) is
  'The only path to reading suggestion_identity_mappings. Every call is written to audit_logs.';
