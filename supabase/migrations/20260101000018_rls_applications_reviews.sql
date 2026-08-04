-- =============================================================================
-- 0018: RLS — applications, submissions, answers, and the review system
-- =============================================================================

alter table public.application_campaigns enable row level security;
alter table public.application_positions enable row level security;
alter table public.application_submissions enable row level security;
alter table public.application_answers enable row level security;
alter table public.application_status_history enable row level security;
alter table public.review_rubrics enable row level security;
alter table public.review_rubric_items enable row level security;
alter table public.review_assignments enable row level security;
alter table public.application_reviews enable row level security;
alter table public.application_review_scores enable row level security;

-- ---------------------------------------------------------------------------
-- campaigns / positions — visible (non-draft) to eligible-grade students;
-- fully visible + writable to applications.manage.
-- ---------------------------------------------------------------------------
create policy application_campaigns_select_eligible on public.application_campaigns
  for select using (
    status not in ('draft', 'cancelled')
    and (
      eligible_grade_level_ids is null or array_length(eligible_grade_level_ids, 1) is null
      or exists (select 1 from public.profiles p where p.id = public.current_profile_id() and p.grade_level_id = any(application_campaigns.eligible_grade_level_ids))
    )
  );

create policy application_campaigns_select_manage on public.application_campaigns
  for select using (public.has_capability('applications.manage'));

create policy application_campaigns_write_manage on public.application_campaigns for all
  using (public.has_capability('applications.manage')) with check (public.has_capability('applications.manage'));

create policy application_positions_select_all on public.application_positions for select using (
  exists (select 1 from public.application_campaigns c where c.id = application_positions.campaign_id)
);
create policy application_positions_write_manage on public.application_positions for all
  using (public.has_capability('applications.manage')) with check (public.has_capability('applications.manage'));

-- ---------------------------------------------------------------------------
-- submissions — self, admin, and assigned reviewer read access. Status
-- transitions for self-service are validated by trigger (see below), not by
-- RLS, so both students and admins can share simple ownership policies.
-- ---------------------------------------------------------------------------
create policy application_submissions_select_self on public.application_submissions
  for select using (student_id = public.current_profile_id());

create policy application_submissions_select_manage on public.application_submissions
  for select using (public.has_capability('applications.manage'));

create policy application_submissions_select_reviewer on public.application_submissions
  for select using (
    exists (select 1 from public.review_assignments ra where ra.submission_id = application_submissions.id and ra.reviewer_id = public.current_profile_id())
  );

create policy application_submissions_insert_self on public.application_submissions
  for insert with check (student_id = public.current_profile_id());

create policy application_submissions_update_self on public.application_submissions
  for update using (student_id = public.current_profile_id()) with check (student_id = public.current_profile_id());

create policy application_submissions_update_manage on public.application_submissions
  for update using (public.has_capability('applications.manage')) with check (public.has_capability('applications.manage'));

create or replace function public.enforce_application_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign record;
begin
  if new.status = old.status then
    return new;
  end if;

  if public.has_capability('applications.manage') then
    return new;
  end if;

  if old.status = 'draft' and new.status = 'submitted' then
    return new;
  end if;

  if old.status in ('submitted', 'under_review', 'interview') and new.status = 'withdrawn' then
    select * into v_campaign from public.application_campaigns where id = new.campaign_id;
    if v_campaign.withdrawal_deadline is not null and now() > v_campaign.withdrawal_deadline then
      raise exception 'The withdrawal deadline for this campaign has passed.' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  raise exception 'You are not allowed to change this application from % to %.', old.status, new.status
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger trg_enforce_application_status_transition
  before update of status on public.application_submissions
  for each row execute function public.enforce_application_status_transition();

-- ---------------------------------------------------------------------------
-- answers — same visibility as the parent submission; writable by the owner
-- only while the submission is still a draft (or by admin, for corrections).
-- ---------------------------------------------------------------------------
create policy application_answers_select on public.application_answers for select using (
  exists (
    select 1 from public.application_submissions sub
    where sub.id = application_answers.submission_id
      and (
        sub.student_id = public.current_profile_id()
        or public.has_capability('applications.manage')
        or exists (select 1 from public.review_assignments ra where ra.submission_id = sub.id and ra.reviewer_id = public.current_profile_id())
      )
  )
);

create policy application_answers_write_self on public.application_answers for all using (
  exists (
    select 1 from public.application_submissions sub
    where sub.id = application_answers.submission_id and sub.student_id = public.current_profile_id() and sub.status = 'draft'
  )
) with check (
  exists (
    select 1 from public.application_submissions sub
    where sub.id = application_answers.submission_id and sub.student_id = public.current_profile_id() and sub.status = 'draft'
  )
);

create policy application_answers_write_manage on public.application_answers for all
  using (public.has_capability('applications.manage')) with check (public.has_capability('applications.manage'));

create policy application_status_history_select on public.application_status_history for select using (
  exists (
    select 1 from public.application_submissions sub
    where sub.id = application_status_history.submission_id
      and (
        sub.student_id = public.current_profile_id()
        or public.has_capability('applications.manage')
        or exists (select 1 from public.review_assignments ra where ra.submission_id = sub.id and ra.reviewer_id = public.current_profile_id())
      )
  )
);

-- ---------------------------------------------------------------------------
-- reviews — reviewers manage rubrics never; admins (`reviewers.manage`) do.
-- ---------------------------------------------------------------------------
create policy review_rubrics_select on public.review_rubrics for select using (
  public.has_capability('reviewers.manage') or public.has_capability('applications.manage')
  or exists (
    select 1 from public.review_assignments ra join public.application_submissions sub on sub.id = ra.submission_id
    join public.application_campaigns camp on camp.id = sub.campaign_id
    where ra.reviewer_id = public.current_profile_id() and camp.review_rubric_id = review_rubrics.id
  )
);
create policy review_rubrics_write on public.review_rubrics for all
  using (public.has_capability('reviewers.manage') or public.has_capability('applications.manage'))
  with check (public.has_capability('reviewers.manage') or public.has_capability('applications.manage'));

create policy review_rubric_items_select on public.review_rubric_items for select using (
  exists (select 1 from public.review_rubrics rr where rr.id = review_rubric_items.rubric_id)
);
create policy review_rubric_items_write on public.review_rubric_items for all
  using (public.has_capability('reviewers.manage') or public.has_capability('applications.manage'))
  with check (public.has_capability('reviewers.manage') or public.has_capability('applications.manage'));

create policy review_assignments_select_self on public.review_assignments for select using (reviewer_id = public.current_profile_id());
create policy review_assignments_select_manage on public.review_assignments for select using (
  public.has_capability('reviewers.manage') or public.has_capability('applications.manage')
);
create policy review_assignments_update_self on public.review_assignments for update
  using (reviewer_id = public.current_profile_id()) with check (reviewer_id = public.current_profile_id());
create policy review_assignments_write_manage on public.review_assignments for all
  using (public.has_capability('reviewers.manage') or public.has_capability('applications.manage'))
  with check (public.has_capability('reviewers.manage') or public.has_capability('applications.manage'));

-- Encapsulates the blind-review rule so it's defined once and reused by
-- both application_reviews and application_review_scores policies.
create or replace function public.can_view_reviews_for_submission(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_capability('reviews.manage')
    or (
      exists (
        select 1 from public.review_assignments ra
        where ra.submission_id = p_submission_id and ra.reviewer_id = public.current_profile_id()
      )
      and (
        not exists (
          select 1 from public.application_submissions sub
          join public.application_campaigns camp on camp.id = sub.campaign_id
          where sub.id = p_submission_id and camp.blind_review
        )
        or exists (
          select 1 from public.application_reviews mine
          where mine.submission_id = p_submission_id and mine.reviewer_id = public.current_profile_id() and mine.status = 'submitted'
        )
      )
    );
$$;

create policy application_reviews_select on public.application_reviews for select using (
  reviewer_id = public.current_profile_id() or public.can_view_reviews_for_submission(submission_id)
);
create policy application_reviews_write_self on public.application_reviews for all
  using (reviewer_id = public.current_profile_id()) with check (reviewer_id = public.current_profile_id());
create policy application_reviews_write_manage on public.application_reviews for all
  using (public.has_capability('reviews.manage')) with check (public.has_capability('reviews.manage'));

create policy application_review_scores_select on public.application_review_scores for select using (
  exists (
    select 1 from public.application_reviews r
    where r.id = application_review_scores.review_id
      and (r.reviewer_id = public.current_profile_id() or public.can_view_reviews_for_submission(r.submission_id))
  )
);
create policy application_review_scores_write_self on public.application_review_scores for all using (
  exists (select 1 from public.application_reviews r where r.id = application_review_scores.review_id and r.reviewer_id = public.current_profile_id())
) with check (
  exists (select 1 from public.application_reviews r where r.id = application_review_scores.review_id and r.reviewer_id = public.current_profile_id())
);
create policy application_review_scores_write_manage on public.application_review_scores for all
  using (public.has_capability('reviews.manage')) with check (public.has_capability('reviews.manage'));
