-- =============================================================================
-- 0013: announcements and FAQ
-- =============================================================================

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text,
  cover_image_url text,
  audience public.announcement_audience not null default 'all_students',
  eligible_grade_level_ids uuid[],
  custom_audience_user_ids uuid[],
  publish_at timestamptz,
  expires_at timestamptz,
  pinned boolean not null default false,
  urgent boolean not null default false,
  related_event_id uuid references public.events (id) on delete set null,
  related_campaign_id uuid references public.application_campaigns (id) on delete set null,
  related_election_id uuid references public.elections (id) on delete set null,
  status public.announcement_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  check (expires_at is null or publish_at is null or expires_at > publish_at)
);

create index idx_announcements_status on public.announcements (status);
create index idx_announcements_pinned on public.announcements (pinned) where pinned;

create table public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, student_id)
);

create table public.faq_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.faq_categories (key, label, sort_order) values
  ('student_council', 'Student Council', 1),
  ('applications', 'Applications', 2),
  ('elections', 'Elections', 3),
  ('events', 'Events', 4),
  ('suggestions', 'Suggestions', 5),
  ('account_and_login', 'Account and Login', 6),
  ('privacy', 'Privacy', 7);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.faq_categories (id) on delete set null,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  status public.faq_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz
);

create index idx_faqs_status on public.faqs (status);
create index idx_faqs_search on public.faqs using gin ((question || ' ' || answer) gin_trgm_ops);

create table public.faq_feedback (
  id uuid primary key default gen_random_uuid(),
  faq_id uuid not null references public.faqs (id) on delete cascade,
  student_id uuid references public.profiles (id) on delete set null,
  is_helpful boolean not null,
  created_at timestamptz not null default now()
);

create unique index idx_faq_feedback_unique_per_student
  on public.faq_feedback (faq_id, student_id) where student_id is not null;

create trigger trg_announcements_updated_at before update on public.announcements for each row execute function public.set_updated_at();
create trigger trg_faqs_updated_at before update on public.faqs for each row execute function public.set_updated_at();
