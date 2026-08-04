-- =============================================================================
-- 0007: student council applications
-- =============================================================================

create table public.application_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  academic_year text,
  opening_at timestamptz,
  closing_at timestamptz,
  eligibility_requirements text,
  eligible_grade_level_ids uuid[],
  form_version_id uuid references public.form_versions (id) on delete set null,
  review_rubric_id uuid,
  status public.campaign_status not null default 'draft',
  confirmation_message text,
  result_release_at timestamptz,
  contact_email citext,
  allow_reapply boolean not null default false,
  blind_review boolean not null default true,
  withdrawal_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  check (closing_at is null or opening_at is null or closing_at >= opening_at)
);

create index idx_application_campaigns_status on public.application_campaigns (status);

create table public.application_positions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.application_campaigns (id) on delete cascade,
  title text not null,
  description text,
  responsibilities text,
  eligibility text,
  max_seats integer check (max_seats is null or max_seats > 0),
  requires_interview boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_application_positions_campaign on public.application_positions (campaign_id);

create table public.application_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.application_campaigns (id) on delete cascade,
  position_id uuid not null references public.application_positions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  form_version_id uuid not null references public.form_versions (id),
  status public.application_status not null default 'draft',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  submitted_at timestamptz,
  returned_for_correction_reason text,
  decision_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_application_submissions_student on public.application_submissions (student_id);
create index idx_application_submissions_campaign on public.application_submissions (campaign_id, position_id);
create index idx_application_submissions_status on public.application_submissions (status);

create table public.application_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.application_submissions (id) on delete cascade,
  question_id uuid not null references public.form_questions (id),
  value_json jsonb not null default 'null'::jsonb,
  file_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, question_id)
);

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.application_submissions (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  reason text,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index idx_application_status_history_submission on public.application_status_history (submission_id);

create trigger trg_application_campaigns_updated_at before update on public.application_campaigns for each row execute function public.set_updated_at();
create trigger trg_application_positions_updated_at before update on public.application_positions for each row execute function public.set_updated_at();
create trigger trg_application_submissions_updated_at before update on public.application_submissions for each row execute function public.set_updated_at();
create trigger trg_application_answers_updated_at before update on public.application_answers for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- One application per (campaign, position, student) unless the campaign
-- explicitly allows re-applying. Enforced in the database, not just the UI.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_single_application()
returns trigger
language plpgsql
as $$
declare
  v_allow_reapply boolean;
  v_existing_count integer;
begin
  select allow_reapply into v_allow_reapply
  from public.application_campaigns
  where id = new.campaign_id;

  if not coalesce(v_allow_reapply, false) then
    select count(*) into v_existing_count
    from public.application_submissions
    where campaign_id = new.campaign_id
      and position_id = new.position_id
      and student_id = new.student_id
      and status <> 'withdrawn'
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if v_existing_count > 0 then
      raise exception 'An active application already exists for this position.'
        using errcode = 'unique_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_single_application
  before insert or update of status on public.application_submissions
  for each row execute function public.enforce_single_application();

-- Automatically record every status transition for the audit trail.
create or replace function public.log_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.application_status_history (submission_id, from_status, to_status, changed_by)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      public.current_profile_id()
    );
  end if;
  return new;
end;
$$;

create trigger trg_log_application_status_change
  after insert or update of status on public.application_submissions
  for each row execute function public.log_application_status_change();
