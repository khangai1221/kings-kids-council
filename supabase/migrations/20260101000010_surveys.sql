-- =============================================================================
-- 0010: surveys and polls
-- =============================================================================

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  mode public.survey_mode not null default 'anonymous',
  form_version_id uuid references public.form_versions (id) on delete set null,
  eligible_grade_level_ids uuid[] not null default '{}',
  opens_at timestamptz,
  closes_at timestamptz,
  allow_edit_before_close boolean not null default false,
  show_live_results boolean not null default false,
  show_results_after_submission boolean not null default false,
  hide_results boolean not null default false,
  limit_one_response boolean not null default true,
  require_all_questions boolean not null default false,
  randomize_choices boolean not null default false,
  thank_you_message text,
  status public.survey_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create index idx_surveys_status on public.surveys (status);

-- Proves *that* a student responded (for tracking-mode surveys and to
-- enforce "limit one response") without linking to answer content. Pure
-- `anonymous` mode intentionally never writes a row here — see
-- lib/validation/survey.ts and the privacy page for why that mode cannot
-- offer a server-enforced single-response guarantee.
create table public.survey_participation (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  participated_at timestamptz not null default now(),
  unique (survey_id, student_id)
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  student_id uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_survey_responses_survey on public.survey_responses (survey_id);

create table public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.survey_responses (id) on delete cascade,
  question_id uuid not null references public.form_questions (id),
  value_json jsonb not null default 'null'::jsonb
);

create index idx_survey_answers_response on public.survey_answers (response_id);
create index idx_survey_answers_question on public.survey_answers (question_id);

create trigger trg_surveys_updated_at before update on public.surveys for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Secure submission RPC — single transaction, mode-aware identity handling,
-- one-response enforcement for the two tracked modes.
-- ---------------------------------------------------------------------------
create or replace function public.submit_survey_response(p_survey_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_grade_level_id uuid;
  v_survey record;
  v_response_id uuid;
  v_answer jsonb;
begin
  v_student_id := public.current_profile_id();
  if v_student_id is null then
    raise exception 'You must be signed in to respond.' using errcode = '28000';
  end if;

  select grade_level_id into v_grade_level_id from public.profiles where id = v_student_id;
  select * into v_survey from public.surveys where id = p_survey_id for update;

  if not found then
    raise exception 'Survey not found.' using errcode = 'no_data_found';
  end if;

  if v_survey.status <> 'open' then
    raise exception 'This survey is not currently open.' using errcode = 'check_violation';
  end if;

  if (v_survey.opens_at is not null and now() < v_survey.opens_at)
     or (v_survey.closes_at is not null and now() > v_survey.closes_at) then
    raise exception 'This survey is not currently within its response window.' using errcode = 'check_violation';
  end if;

  if array_length(v_survey.eligible_grade_level_ids, 1) is not null
     and not (v_grade_level_id = any(v_survey.eligible_grade_level_ids)) then
    raise exception 'You are not eligible to respond to this survey.' using errcode = 'insufficient_privilege';
  end if;

  if v_survey.mode in ('identified', 'anonymous_with_participation_tracking') and v_survey.limit_one_response then
    if exists (select 1 from public.survey_participation where survey_id = p_survey_id and student_id = v_student_id) then
      raise exception 'You have already responded to this survey.' using errcode = 'unique_violation';
    end if;
    insert into public.survey_participation (survey_id, student_id) values (p_survey_id, v_student_id);
  end if;

  insert into public.survey_responses (survey_id, student_id)
  values (p_survey_id, case when v_survey.mode = 'identified' then v_student_id else null end)
  returning id into v_response_id;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    insert into public.survey_answers (response_id, question_id, value_json)
    values (v_response_id, (v_answer ->> 'question_id')::uuid, coalesce(v_answer -> 'value', 'null'::jsonb));
  end loop;

  return v_response_id;
exception
  when unique_violation then
    raise exception 'You have already responded to this survey.' using errcode = 'unique_violation';
end;
$$;

-- SELECT stays grantable (survey_participation_select_manage policy in the
-- RLS migration lets admins see response *rates* for the tracking mode);
-- only direct writes are blocked so the RPC above is the sole write path.
revoke insert, update, delete on public.survey_participation from authenticated, anon;
grant execute on function public.submit_survey_response(uuid, jsonb) to authenticated;

comment on column public.survey_responses.student_id is
  'Only ever populated when surveys.mode = identified. Null for both anonymous modes.';
