-- =============================================================================
-- 0005: student council information (terms, positions, members)
-- =============================================================================

create table public.council_terms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  academic_year text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create unique index idx_council_terms_current on public.council_terms (is_current) where is_current;

create table public.council_positions (
  id uuid primary key default gen_random_uuid(),
  term_id uuid references public.council_terms (id) on delete set null,
  title text not null,
  description text,
  responsibilities text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.council_members (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.council_terms (id) on delete cascade,
  position_id uuid references public.council_positions (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  photo_url text,
  grade_level_label text,
  short_bio text,
  responsibilities text,
  term_start date,
  term_end date,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz
);

create index idx_council_members_term on public.council_members (term_id);
create index idx_council_members_status on public.council_members (status);

create trigger trg_council_terms_updated_at before update on public.council_terms for each row execute function public.set_updated_at();
create trigger trg_council_positions_updated_at before update on public.council_positions for each row execute function public.set_updated_at();
create trigger trg_council_members_updated_at before update on public.council_members for each row execute function public.set_updated_at();

comment on table public.council_members is
  'Public council member profile cards. Never store phone numbers, personal emails or private social accounts here.';
