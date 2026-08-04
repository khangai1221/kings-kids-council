-- =============================================================================
-- 0008: application review system (rubrics, assignments, reviews, scores)
-- =============================================================================

create table public.review_rubrics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

alter table public.application_campaigns
  add constraint fk_application_campaigns_rubric
  foreign key (review_rubric_id) references public.review_rubrics (id) on delete set null;

create table public.review_rubric_items (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.review_rubrics (id) on delete cascade,
  label text not null,
  description text,
  weight numeric not null default 1 check (weight > 0),
  min_score numeric not null default 0,
  max_score numeric not null default 5,
  position integer not null default 0,
  check (max_score > min_score)
);

create index idx_review_rubric_items_rubric on public.review_rubric_items (rubric_id, position);

create table public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.application_submissions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  status public.review_assignment_status not null default 'assigned',
  conflict_of_interest boolean not null default false,
  conflict_note text,
  unique (submission_id, reviewer_id)
);

create index idx_review_assignments_reviewer on public.review_assignments (reviewer_id);
create index idx_review_assignments_submission on public.review_assignments (submission_id);

create table public.application_reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.review_assignments (id) on delete cascade,
  submission_id uuid not null references public.application_submissions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  recommendation public.review_recommendation,
  private_comments text,
  interview_notes text,
  internal_tags text[],
  status public.review_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_application_reviews_submission on public.application_reviews (submission_id);

create table public.application_review_scores (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.application_reviews (id) on delete cascade,
  rubric_item_id uuid not null references public.review_rubric_items (id) on delete cascade,
  score numeric not null,
  note text,
  unique (review_id, rubric_item_id)
);

create trigger trg_review_rubrics_updated_at before update on public.review_rubrics for each row execute function public.set_updated_at();
create trigger trg_application_reviews_updated_at before update on public.application_reviews for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Weighted score view: one row per submission with the weighted-average
-- score across all *submitted* reviews. Used by the admin reviews dashboard
-- and exports; never exposes an individual reviewer's raw private comments.
-- ---------------------------------------------------------------------------
create view public.application_weighted_scores as
select
  ar.submission_id,
  count(distinct ar.id) filter (where ar.status = 'submitted') as completed_reviews,
  sum(ars.score * rri.weight) / nullif(sum(rri.weight), 0) as weighted_average
from public.application_reviews ar
join public.application_review_scores ars on ars.review_id = ar.id
join public.review_rubric_items rri on rri.id = ars.rubric_item_id
where ar.status = 'submitted'
group by ar.submission_id;

comment on view public.application_weighted_scores is
  'Aggregate only. Do not add reviewer-identifying columns to this view; individual scores stay behind RLS on application_review_scores.';
