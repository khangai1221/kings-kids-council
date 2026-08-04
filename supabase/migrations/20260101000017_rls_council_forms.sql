-- =============================================================================
-- 0017: RLS — council information & the reusable form builder
-- =============================================================================

alter table public.council_terms enable row level security;
alter table public.council_positions enable row level security;
alter table public.council_members enable row level security;

create policy council_terms_select_all on public.council_terms for select using (true);
create policy council_terms_write_manage on public.council_terms for all
  using (public.has_capability('council.manage')) with check (public.has_capability('council.manage'));

create policy council_positions_select_all on public.council_positions for select using (true);
create policy council_positions_write_manage on public.council_positions for all
  using (public.has_capability('council.manage')) with check (public.has_capability('council.manage'));

create policy council_members_select_published on public.council_members for select using (status = 'published');
create policy council_members_select_manage on public.council_members for select using (public.has_capability('council.manage'));
create policy council_members_write_manage on public.council_members for all
  using (public.has_capability('council.manage')) with check (public.has_capability('council.manage'));

-- ---------------------------------------------------------------------------
-- forms / form_versions / form_questions / form_question_options / form_conditions
-- Drafts are only visible to whoever manages that form kind; published (or
-- closed, for historical reference) versions are visible to any authenticated
-- user so applicants/respondents can render them.
-- ---------------------------------------------------------------------------
alter table public.forms enable row level security;
alter table public.form_versions enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_question_options enable row level security;
alter table public.form_conditions enable row level security;

create or replace function public.can_manage_form_kind(p_kind public.form_kind)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_kind
    when 'application' then public.has_capability('applications.manage') or public.has_capability('forms.manage')
    when 'survey' then public.has_capability('surveys.manage') or public.has_capability('forms.manage')
    when 'event_registration' then public.has_capability('events.manage') or public.has_capability('forms.manage')
    else public.has_capability('forms.manage')
  end;
$$;

create policy forms_select_published on public.forms for select using (status in ('published', 'closed'));
create policy forms_select_manage on public.forms for select using (public.can_manage_form_kind(kind));
create policy forms_write_manage on public.forms for all
  using (public.can_manage_form_kind(kind)) with check (public.can_manage_form_kind(kind));

create policy form_versions_select_published on public.form_versions for select using (status in ('published', 'closed'));
create policy form_versions_select_manage on public.form_versions for select using (
  exists (select 1 from public.forms f where f.id = form_versions.form_id and public.can_manage_form_kind(f.kind))
);
create policy form_versions_write_manage on public.form_versions for all using (
  exists (select 1 from public.forms f where f.id = form_versions.form_id and public.can_manage_form_kind(f.kind))
) with check (
  exists (select 1 from public.forms f where f.id = form_versions.form_id and public.can_manage_form_kind(f.kind))
);

create policy form_questions_select_published on public.form_questions for select using (
  exists (select 1 from public.form_versions fv where fv.id = form_questions.form_version_id and fv.status in ('published', 'closed'))
);
create policy form_questions_select_manage on public.form_questions for select using (
  exists (
    select 1 from public.form_versions fv join public.forms f on f.id = fv.form_id
    where fv.id = form_questions.form_version_id and public.can_manage_form_kind(f.kind)
  )
);
create policy form_questions_write_manage on public.form_questions for all using (
  exists (
    select 1 from public.form_versions fv join public.forms f on f.id = fv.form_id
    where fv.id = form_questions.form_version_id and public.can_manage_form_kind(f.kind)
  )
) with check (
  exists (
    select 1 from public.form_versions fv join public.forms f on f.id = fv.form_id
    where fv.id = form_questions.form_version_id and public.can_manage_form_kind(f.kind)
  )
);

create policy form_question_options_select_published on public.form_question_options for select using (
  exists (
    select 1 from public.form_questions fq join public.form_versions fv on fv.id = fq.form_version_id
    where fq.id = form_question_options.question_id and fv.status in ('published', 'closed')
  )
);
create policy form_question_options_select_manage on public.form_question_options for select using (
  exists (
    select 1 from public.form_questions fq join public.form_versions fv on fv.id = fq.form_version_id join public.forms f on f.id = fv.form_id
    where fq.id = form_question_options.question_id and public.can_manage_form_kind(f.kind)
  )
);
create policy form_question_options_write_manage on public.form_question_options for all using (
  exists (
    select 1 from public.form_questions fq join public.form_versions fv on fv.id = fq.form_version_id join public.forms f on f.id = fv.form_id
    where fq.id = form_question_options.question_id and public.can_manage_form_kind(f.kind)
  )
) with check (
  exists (
    select 1 from public.form_questions fq join public.form_versions fv on fv.id = fq.form_version_id join public.forms f on f.id = fv.form_id
    where fq.id = form_question_options.question_id and public.can_manage_form_kind(f.kind)
  )
);

create policy form_conditions_select_published on public.form_conditions for select using (
  exists (
    select 1 from public.form_questions fq join public.form_versions fv on fv.id = fq.form_version_id
    where fq.id = form_conditions.question_id and fv.status in ('published', 'closed')
  )
);
create policy form_conditions_select_manage on public.form_conditions for select using (
  exists (
    select 1 from public.form_questions fq join public.form_versions fv on fv.id = fq.form_version_id join public.forms f on f.id = fv.form_id
    where fq.id = form_conditions.question_id and public.can_manage_form_kind(f.kind)
  )
);
create policy form_conditions_write_manage on public.form_conditions for all using (
  exists (
    select 1 from public.form_questions fq join public.form_versions fv on fv.id = fq.form_version_id join public.forms f on f.id = fv.form_id
    where fq.id = form_conditions.question_id and public.can_manage_form_kind(f.kind)
  )
) with check (
  exists (
    select 1 from public.form_questions fq join public.form_versions fv on fv.id = fq.form_version_id join public.forms f on f.id = fv.form_id
    where fq.id = form_conditions.question_id and public.can_manage_form_kind(f.kind)
  )
);
