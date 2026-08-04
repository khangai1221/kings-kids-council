-- =============================================================================
-- 0003: identity, roles/permissions, lookups, and site settings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Lookups: grades and classes come from admin-managed settings, never free
-- text, so onboarding and eligibility checks stay consistent everywhere.
-- ---------------------------------------------------------------------------
create table public.grade_levels (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_classes (
  id uuid primary key default gen_random_uuid(),
  grade_level_id uuid references public.grade_levels (id) on delete set null,
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_grade_levels_updated_at
  before update on public.grade_levels
  for each row execute function public.set_updated_at();

create trigger trg_school_classes_updated_at
  before update on public.school_classes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles — synchronized from Clerk via the webhook handler. clerk_user_id
-- is the external identity reference; the internal uuid `id` is the FK
-- target used by every other table so a changed email never breaks joins.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  school_email citext not null unique,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  grade_level_id uuid references public.grade_levels (id) on delete set null,
  school_class_id uuid references public.school_classes (id) on delete set null,
  graduation_year integer check (graduation_year is null or graduation_year between 2000 and 2100),
  role public.app_role not null default 'student',
  account_status public.account_status not null default 'active',
  onboarding_status public.onboarding_status not null default 'pending',
  accepted_rules_at timestamptz,
  accepted_privacy_at timestamptz,
  notification_in_app_default boolean not null default true,
  notification_push_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz,
  deactivated_at timestamptz
);

create index idx_profiles_role on public.profiles (role);
create index idx_profiles_grade_level on public.profiles (grade_level_id);
create index idx_profiles_account_status on public.profiles (account_status);
create index idx_profiles_search on public.profiles using gin (
  (first_name || ' ' || last_name || ' ' || display_name || ' ' || school_email) gin_trgm_ops
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on table public.profiles is
  'Student council portal user profiles. clerk_user_id is the external identity reference; do not key relationships off school_email since it can change.';

-- ---------------------------------------------------------------------------
-- Roles & permissions catalog. The six-role set is a fixed product concept
-- (see app_role enum) — this table only carries admin-editable metadata
-- (labels/descriptions) plus the join target for role_permissions/user_roles.
-- ---------------------------------------------------------------------------
create table public.roles (
  key text primary key check (key in ('student', 'council_member', 'reviewer', 'admin', 'teacher_advisor', 'super_admin')),
  label text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_roles_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

create table public.permissions (
  key text primary key,
  label text not null,
  description text,
  category text not null default 'general',
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_key text not null references public.roles (key) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id) on delete set null,
  primary key (role_key, permission_key)
);

-- Supplementary roles a user holds in addition to their primary `profiles.role`
-- (e.g. a student who is also a reviewer for one cycle).
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_key text not null references public.roles (key) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id) on delete set null,
  unique (user_id, role_key)
);

create index idx_user_roles_user on public.user_roles (user_id);

-- ---------------------------------------------------------------------------
-- Site settings — single editable row backing the typed settings service.
-- ---------------------------------------------------------------------------
create table public.site_settings (
  singleton boolean primary key default true,
  portal_name text not null default 'YM Student Council',
  portal_logo_url text,
  school_name text not null default 'King''s Kids School',
  allowed_email_domain text not null default 'kingskids.mn',
  primary_color text not null default '#193B75',
  primary_color_dark text not null default '#10284F',
  accent_color text not null default '#F2B84B',
  background_color text not null default '#F5F7FB',
  surface_color text not null default '#FFFFFF',
  text_color text not null default '#172033',
  muted_text_color text not null default '#667085',
  success_color text not null default '#15803D',
  warning_color text not null default '#B45309',
  error_color text not null default '#B42318',
  info_color text not null default '#2563EB',
  contact_email citext,
  academic_year text not null default to_char(now(), 'YYYY') || '-' || to_char(now() + interval '1 year', 'YYYY'),
  council_mission text,
  privacy_notice text,
  terms_content text,
  notification_defaults jsonb not null default '{}'::jsonb,
  min_reporting_privacy_threshold integer not null default 5 check (min_reporting_privacy_threshold >= 1),
  file_upload_max_size_bytes bigint not null default 10485760,
  allowed_file_types text[] not null default array['pdf','doc','docx','png','jpg','jpeg'],
  timezone text not null default 'Asia/Ulaanbaatar',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint site_settings_is_singleton check (singleton)
);

create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Baseline reference data (not test/demo data — required for the app to run)
-- ---------------------------------------------------------------------------
insert into public.site_settings (singleton) values (true);

insert into public.grade_levels (key, label, sort_order) values
  ('grade_7', 'Grade 7', 1),
  ('grade_8', 'Grade 8', 2),
  ('grade_9', 'Grade 9', 3),
  ('grade_10', 'Grade 10', 4),
  ('grade_11', 'Grade 11', 5),
  ('grade_12', 'Grade 12', 6);

insert into public.roles (key, label, description) values
  ('student', 'Student', 'Base portal access for every verified student.'),
  ('council_member', 'Council Member', 'Elected or appointed student council member. Gains extra permissions only when explicitly granted.'),
  ('reviewer', 'Reviewer', 'Reviews applications assigned to them.'),
  ('admin', 'Admin', 'Manages day-to-day portal content.'),
  ('teacher_advisor', 'Teacher Advisor', 'Staff oversight role: restricted suggestions, election publication approval, reviewer management, audit log.'),
  ('super_admin', 'Super Admin', 'Full administrative control, including roles, permissions and security settings.');

insert into public.permissions (key, label, description, category) values
  ('users.manage', 'Manage users & directory', 'View/search the user directory, change grade/class, activate/deactivate accounts.', 'identity'),
  ('roles.manage', 'Manage roles & permissions', 'Assign roles and edit role-permission grants.', 'identity'),
  ('council.manage', 'Manage council terms, positions & members', 'Create/edit/reorder/archive/publish council member profiles.', 'council'),
  ('applications.manage', 'Manage applications & campaigns', 'Create/edit application campaigns and positions.', 'applications'),
  ('forms.manage', 'Manage form builder', 'Create/edit/publish reusable forms.', 'forms'),
  ('reviews.manage', 'Manage & moderate reviews', 'View all reviews, moderate scores, view combined results.', 'applications'),
  ('reviewers.manage', 'Assign & manage reviewers', 'Assign reviewers to applications and manage rubrics.', 'applications'),
  ('elections.manage', 'Manage elections & candidates', 'Create/edit elections, positions and candidates.', 'elections'),
  ('elections.publish', 'Publish elections & results', 'Open voting and publish results.', 'elections'),
  ('surveys.manage', 'Manage surveys & polls', 'Create/edit/publish surveys.', 'surveys'),
  ('events.manage', 'Manage events & competitions', 'Create/edit events, manage registrations & attendance.', 'events'),
  ('suggestions.manage', 'Manage suggestions inbox', 'Triage, respond to, and change status of suggestions.', 'suggestions'),
  ('suggestions.manage_restricted', 'Access restricted anonymous identities', 'Reveal the identity behind an anonymous-to-council suggestion.', 'suggestions'),
  ('announcements.manage', 'Manage announcements', 'Create/edit/publish announcements.', 'announcements'),
  ('faq.manage', 'Manage FAQ', 'Create/edit/publish FAQ entries.', 'faq'),
  ('notifications.manage', 'Send admin notifications', 'Broadcast in-app/push notifications.', 'notifications'),
  ('reports.view', 'View reports', 'View admin reporting dashboards.', 'reports'),
  ('reports.export', 'Export reports (CSV)', 'Export permitted report data as CSV.', 'reports'),
  ('audit.view', 'View audit log', 'View the full audit history.', 'security'),
  ('settings.manage', 'Manage site settings', 'Edit portal-wide settings.', 'security');

insert into public.role_permissions (role_key, permission_key) values
  ('admin', 'users.manage'),
  ('admin', 'council.manage'),
  ('admin', 'applications.manage'),
  ('admin', 'forms.manage'),
  ('admin', 'reviews.manage'),
  ('admin', 'reviewers.manage'),
  ('admin', 'elections.manage'),
  ('admin', 'surveys.manage'),
  ('admin', 'events.manage'),
  ('admin', 'suggestions.manage'),
  ('admin', 'announcements.manage'),
  ('admin', 'faq.manage'),
  ('admin', 'notifications.manage'),
  ('admin', 'reports.view'),
  ('admin', 'reports.export'),
  ('teacher_advisor', 'reviews.manage'),
  ('teacher_advisor', 'reviewers.manage'),
  ('teacher_advisor', 'elections.publish'),
  ('teacher_advisor', 'suggestions.manage'),
  ('teacher_advisor', 'suggestions.manage_restricted'),
  ('teacher_advisor', 'reports.view'),
  ('teacher_advisor', 'audit.view');
