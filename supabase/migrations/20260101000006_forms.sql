-- =============================================================================
-- 0006: reusable dynamic form builder (applications, surveys, event registration)
-- =============================================================================

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  kind public.form_kind not null,
  title text not null,
  slug text not null unique,
  description text,
  status public.form_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz
);

create index idx_forms_kind on public.forms (kind);
create trigger trg_forms_updated_at before update on public.forms for each row execute function public.set_updated_at();

-- Publishing changes creates a new immutable version; existing submissions
-- keep referencing the exact version they were submitted against.
create table public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  version_number integer not null,
  status public.form_status not null default 'draft',
  notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (form_id, version_number)
);

create index idx_form_versions_form on public.form_versions (form_id);

create table public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_version_id uuid not null references public.form_versions (id) on delete cascade,
  key text not null,
  type public.question_type not null,
  label text not null,
  description text,
  placeholder text,
  help_text text,
  is_required boolean not null default false,
  position integer not null default 0,
  min_length integer,
  max_length integer,
  min_number numeric,
  max_number numeric,
  allowed_file_types text[],
  max_file_size_bytes bigint,
  choice_allow_other boolean not null default false,
  rating_scale integer,
  admin_notes text,
  eligible_grade_level_ids uuid[],
  visible_for_position_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_version_id, key)
);

create index idx_form_questions_version on public.form_questions (form_version_id, position);

create table public.form_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.form_questions (id) on delete cascade,
  value text not null,
  label text not null,
  position integer not null default 0,
  is_other_option boolean not null default false
);

create index idx_form_question_options_question on public.form_question_options (question_id, position);

create table public.form_conditions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.form_questions (id) on delete cascade,
  depends_on_question_id uuid not null references public.form_questions (id) on delete cascade,
  operator text not null check (operator in ('equals', 'not_equals', 'contains', 'one_of', 'answered', 'not_answered')),
  comparison_value jsonb,
  created_at timestamptz not null default now(),
  check (question_id <> depends_on_question_id)
);

create index idx_form_conditions_question on public.form_conditions (question_id);

create trigger trg_form_questions_updated_at before update on public.form_questions for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Immutability: once a form_version is published, its questions/options/
-- conditions may no longer be mutated. Admins must duplicate to a new draft.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_form_version_immutability()
returns trigger
language plpgsql
as $$
declare
  v_form_version_id uuid;
  v_status public.form_status;
begin
  -- NEW/OLD are polymorphic `record`s here (this function is shared across
  -- three trigger tables), so `new.form_version_id` can only be referenced
  -- when the firing table actually has that column — referencing a
  -- nonexistent field on a record raises at runtime, not at parse time.
  if tg_table_name = 'form_questions' then
    v_form_version_id := coalesce(new.form_version_id, old.form_version_id);
  else
    select fq.form_version_id into v_form_version_id
    from public.form_questions fq
    where fq.id = coalesce(new.question_id, old.question_id);
  end if;

  select status into v_status from public.form_versions where id = v_form_version_id;

  if v_status is not null and v_status <> 'draft' then
    raise exception 'Cannot modify questions of a % form version. Duplicate it into a new draft instead.', v_status
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_form_questions_immutable
  before insert or update or delete on public.form_questions
  for each row execute function public.enforce_form_version_immutability();

create trigger trg_form_question_options_immutable
  before insert or update or delete on public.form_question_options
  for each row execute function public.enforce_form_version_immutability();

create trigger trg_form_conditions_immutable
  before insert or update or delete on public.form_conditions
  for each row execute function public.enforce_form_version_immutability();

comment on table public.form_versions is
  'Immutable once status <> draft. Publishing again creates a new version row; never edit questions of a published/closed/archived version.';
