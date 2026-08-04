-- =============================================================================
-- 0011: events and competitions
-- =============================================================================

create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.event_categories (key, label, sort_order) values
  ('student_council', 'Student Council', 1),
  ('academic', 'Academic', 2),
  ('sports', 'Sports', 3),
  ('arts', 'Arts', 4),
  ('clubs', 'Clubs', 5),
  ('community_service', 'Community Service', 6),
  ('competition', 'Competition', 7),
  ('meeting', 'Meeting', 8),
  ('school_holiday', 'School Holiday', 9),
  ('other', 'Other', 10);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  cover_image_url text,
  category_id uuid references public.event_categories (id) on delete set null,
  organizer text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  online_meeting_url text,
  eligible_grade_level_ids uuid[] not null default '{}',
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  waitlist_capacity integer check (waitlist_capacity is null or waitlist_capacity >= 0),
  rules text,
  required_materials text,
  competition_format text,
  prizes text,
  contact_info text,
  registration_form_version_id uuid references public.form_versions (id) on delete set null,
  status public.event_status not null default 'draft',
  visibility public.event_visibility not null default 'public',
  featured boolean not null default false,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  check (ends_at >= starts_at)
);

create index idx_events_status on public.events (status);
create index idx_events_starts_at on public.events (starts_at);
create index idx_events_category on public.events (category_id);

create table public.event_attachments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  file_record_id uuid not null,
  label text,
  sort_order integer not null default 0
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.event_registration_status not null default 'registered',
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  waitlist_position integer,
  unique (event_id, student_id)
);

create index idx_event_registrations_event on public.event_registrations (event_id, status);
create index idx_event_registrations_student on public.event_registrations (student_id);

create table public.event_registration_answers (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.event_registrations (id) on delete cascade,
  question_id uuid not null references public.form_questions (id),
  value_json jsonb not null default 'null'::jsonb
);

create table public.saved_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (event_id, student_id)
);

create table public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  registration_id uuid not null unique references public.event_registrations (id) on delete cascade,
  attended boolean not null default false,
  marked_by uuid references public.profiles (id) on delete set null,
  marked_at timestamptz
);

create trigger trg_events_updated_at before update on public.events for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Registration RPC: locks the event row so two concurrent requests can't both
-- observe a free seat, then places the student in the registered list or the
-- waitlist (or rejects if both are full).
-- ---------------------------------------------------------------------------
create or replace function public.register_for_event(p_event_id uuid, p_answers jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_grade_level_id uuid;
  v_event record;
  v_registered_count integer;
  v_waitlisted_count integer;
  v_status public.event_registration_status;
  v_waitlist_pos integer := null;
  v_registration_id uuid;
  v_answer jsonb;
begin
  v_student_id := public.current_profile_id();
  if v_student_id is null then
    raise exception 'You must be signed in to register.' using errcode = '28000';
  end if;

  select grade_level_id into v_grade_level_id from public.profiles where id = v_student_id;
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event not found.' using errcode = 'no_data_found';
  end if;

  if v_event.status not in ('published', 'registration_open') then
    raise exception 'Registration is not open for this event.' using errcode = 'check_violation';
  end if;

  if (v_event.registration_opens_at is not null and now() < v_event.registration_opens_at)
     or (v_event.registration_closes_at is not null and now() > v_event.registration_closes_at) then
    raise exception 'Registration is not currently open for this event.' using errcode = 'check_violation';
  end if;

  if array_length(v_event.eligible_grade_level_ids, 1) is not null
     and not (v_grade_level_id = any(v_event.eligible_grade_level_ids)) then
    raise exception 'You are not eligible to register for this event.' using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from public.event_registrations
    where event_id = p_event_id and student_id = v_student_id and status in ('registered', 'waitlisted')
  ) then
    raise exception 'You are already registered for this event.' using errcode = 'unique_violation';
  end if;

  select count(*) into v_registered_count from public.event_registrations where event_id = p_event_id and status = 'registered';
  select count(*) into v_waitlisted_count from public.event_registrations where event_id = p_event_id and status = 'waitlisted';

  if v_event.capacity is null or v_registered_count < v_event.capacity then
    v_status := 'registered';
  elsif v_event.waitlist_capacity is null or v_waitlisted_count < v_event.waitlist_capacity then
    v_status := 'waitlisted';
    v_waitlist_pos := v_waitlisted_count + 1;
  else
    raise exception 'This event and its waitlist are both full.' using errcode = 'check_violation';
  end if;

  insert into public.event_registrations (event_id, student_id, status, waitlist_position)
  values (p_event_id, v_student_id, v_status, v_waitlist_pos)
  returning id into v_registration_id;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    insert into public.event_registration_answers (registration_id, question_id, value_json)
    values (v_registration_id, (v_answer ->> 'question_id')::uuid, coalesce(v_answer -> 'value', 'null'::jsonb));
  end loop;

  return jsonb_build_object('registration_id', v_registration_id, 'status', v_status, 'waitlist_position', v_waitlist_pos);
exception
  when unique_violation then
    raise exception 'You are already registered for this event.' using errcode = 'unique_violation';
end;
$$;

-- Cancels a registration (self-service or admin) and, if a registered seat
-- opened up, promotes the longest-waiting student off the waitlist. Returns
-- the promoted registration id (or null) so the caller can notify them.
create or replace function public.cancel_event_registration(p_registration_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_reg record;
  v_promoted record;
begin
  v_caller_id := public.current_profile_id();
  select * into v_reg from public.event_registrations where id = p_registration_id for update;
  if not found then
    raise exception 'Registration not found.' using errcode = 'no_data_found';
  end if;

  if v_reg.student_id <> v_caller_id and not public.has_capability('events.manage') then
    raise exception 'You are not allowed to cancel this registration.' using errcode = 'insufficient_privilege';
  end if;

  if v_reg.status = 'cancelled' then
    return null;
  end if;

  update public.event_registrations
  set status = 'cancelled', cancelled_at = now(), waitlist_position = null
  where id = p_registration_id;

  if v_reg.status = 'registered' then
    select * into v_promoted from public.event_registrations
      where event_id = v_reg.event_id and status = 'waitlisted'
      order by waitlist_position asc nulls last, registered_at asc
      for update skip locked
      limit 1;

    if found then
      update public.event_registrations
      set status = 'registered', waitlist_position = null
      where id = v_promoted.id;
      return v_promoted.id;
    end if;
  end if;

  return null;
end;
$$;

-- Manual admin promotion, independent of the auto-promotion-on-cancel path.
create or replace function public.promote_event_registration(p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
  v_event record;
  v_registered_count integer;
begin
  if not public.has_capability('events.manage') then
    raise exception 'Not authorized.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_reg from public.event_registrations where id = p_registration_id for update;
  if not found or v_reg.status <> 'waitlisted' then
    raise exception 'Registration is not on the waitlist.' using errcode = 'check_violation';
  end if;

  select * into v_event from public.events where id = v_reg.event_id for update;
  select count(*) into v_registered_count from public.event_registrations where event_id = v_event.id and status = 'registered';

  if v_event.capacity is not null and v_registered_count >= v_event.capacity then
    raise exception 'Event is already at capacity.' using errcode = 'check_violation';
  end if;

  update public.event_registrations set status = 'registered', waitlist_position = null where id = p_registration_id;
end;
$$;

grant execute on function public.register_for_event(uuid, jsonb) to authenticated;
grant execute on function public.cancel_event_registration(uuid) to authenticated;
grant execute on function public.promote_event_registration(uuid) to authenticated;
