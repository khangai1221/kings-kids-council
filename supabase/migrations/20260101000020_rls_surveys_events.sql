-- =============================================================================
-- 0020: RLS — surveys and events
-- =============================================================================

alter table public.surveys enable row level security;
alter table public.survey_participation enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_answers enable row level security;
alter table public.event_categories enable row level security;
alter table public.events enable row level security;
alter table public.event_attachments enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_registration_answers enable row level security;
alter table public.saved_events enable row level security;
alter table public.event_attendance enable row level security;

revoke insert, update, delete on public.survey_responses, public.survey_answers from authenticated, anon;
revoke insert, update, delete on public.event_registrations, public.event_registration_answers from authenticated, anon;

create policy surveys_select_eligible on public.surveys for select using (
  status not in ('draft', 'archived')
  and (
    array_length(eligible_grade_level_ids, 1) is null
    or exists (select 1 from public.profiles p where p.id = public.current_profile_id() and p.grade_level_id = any(surveys.eligible_grade_level_ids))
  )
);
create policy surveys_select_manage on public.surveys for select using (public.has_capability('surveys.manage'));
create policy surveys_write_manage on public.surveys for all
  using (public.has_capability('surveys.manage')) with check (public.has_capability('surveys.manage'));

create policy survey_participation_select_manage on public.survey_participation for select using (public.has_capability('surveys.manage'));

create policy survey_responses_select_self on public.survey_responses for select using (student_id = public.current_profile_id());
create policy survey_responses_select_manage on public.survey_responses for select using (public.has_capability('surveys.manage'));

create policy survey_answers_select on public.survey_answers for select using (
  exists (
    select 1 from public.survey_responses r
    where r.id = survey_answers.response_id and (r.student_id = public.current_profile_id() or public.has_capability('surveys.manage'))
  )
);

create policy event_categories_select_all on public.event_categories for select using (true);
create policy event_categories_write_manage on public.event_categories for all
  using (public.has_capability('events.manage')) with check (public.has_capability('events.manage'));

create policy events_select_eligible on public.events for select using (
  status not in ('draft', 'archived')
  and (visibility = 'public' or public.is_admin_tier() or 'council_member' = any(public.current_effective_roles()))
  and (
    array_length(eligible_grade_level_ids, 1) is null
    or exists (select 1 from public.profiles p where p.id = public.current_profile_id() and p.grade_level_id = any(events.eligible_grade_level_ids))
  )
);
create policy events_select_manage on public.events for select using (public.has_capability('events.manage'));
create policy events_write_manage on public.events for all
  using (public.has_capability('events.manage')) with check (public.has_capability('events.manage'));

create policy event_attachments_select on public.event_attachments for select using (
  exists (select 1 from public.events e where e.id = event_attachments.event_id)
);
create policy event_attachments_write_manage on public.event_attachments for all
  using (public.has_capability('events.manage')) with check (public.has_capability('events.manage'));

create policy event_registrations_select_self on public.event_registrations for select using (student_id = public.current_profile_id());
create policy event_registrations_select_manage on public.event_registrations for select using (public.has_capability('events.manage'));

create policy event_registration_answers_select on public.event_registration_answers for select using (
  exists (
    select 1 from public.event_registrations r
    where r.id = event_registration_answers.registration_id and (r.student_id = public.current_profile_id() or public.has_capability('events.manage'))
  )
);

create policy saved_events_all_self on public.saved_events for all
  using (student_id = public.current_profile_id()) with check (student_id = public.current_profile_id());

create policy event_attendance_select on public.event_attendance for select using (
  public.has_capability('events.manage')
  or exists (select 1 from public.event_registrations r where r.id = event_attendance.registration_id and r.student_id = public.current_profile_id())
);
create policy event_attendance_write_manage on public.event_attendance for all
  using (public.has_capability('events.manage')) with check (public.has_capability('events.manage'));
