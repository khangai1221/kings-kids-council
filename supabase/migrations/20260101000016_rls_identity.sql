-- =============================================================================
-- 0016: RLS — identity, roles/permissions, lookups, site settings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles: field-level protection via trigger (RLS alone is row-level, and
-- admin vs student both use the same `authenticated` Postgres role, so
-- column grants can't distinguish them — a trigger inspecting OLD/NEW can).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_profile_field_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.has_capability('roles.manage') then
    raise exception 'Only users with roles.manage may change a profile role.' using errcode = 'insufficient_privilege';
  end if;

  if new.account_status is distinct from old.account_status and not public.has_capability('users.manage') then
    raise exception 'Only users with users.manage may change account status.' using errcode = 'insufficient_privilege';
  end if;

  if (new.clerk_user_id is distinct from old.clerk_user_id or new.school_email is distinct from old.school_email)
     and auth.role() <> 'service_role' then
    raise exception 'clerk_user_id and school_email can only be changed by the identity sync webhook.' using errcode = 'insufficient_privilege';
  end if;

  if (
      new.grade_level_id is distinct from old.grade_level_id
      or new.school_class_id is distinct from old.school_class_id
      or new.graduation_year is distinct from old.graduation_year
    )
    and not (old.id = public.current_profile_id() or public.has_capability('users.manage')) then
    raise exception 'Not authorized to change grade/class for another student.' using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_profile_field_protection
  before update on public.profiles
  for each row execute function public.enforce_profile_field_protection();

alter table public.profiles enable row level security;

-- Active profiles are readable school-wide (comparable to a school
-- directory / yearbook: name, grade, role, avatar — nothing from the
-- "do not collect" list lives on this table). Inactive/suspended rows are
-- only visible to their owner, admins, or an assigned reviewer.
create policy profiles_select_active on public.profiles
  for select using (account_status = 'active');

create policy profiles_select_self on public.profiles
  for select using (id = public.current_profile_id());

create policy profiles_select_admin on public.profiles
  for select using (public.has_capability('users.manage') or public.is_admin_tier());

create policy profiles_select_reviewer_assigned on public.profiles
  for select using (
    exists (
      select 1
      from public.review_assignments ra
      join public.application_submissions sub on sub.id = ra.submission_id
      where ra.reviewer_id = public.current_profile_id() and sub.student_id = public.profiles.id
    )
  );

create policy profiles_update_self on public.profiles
  for update using (id = public.current_profile_id()) with check (id = public.current_profile_id());

create policy profiles_update_admin on public.profiles
  for update using (public.has_capability('users.manage')) with check (public.has_capability('users.manage'));

-- No INSERT/DELETE policies: rows are created by the Clerk webhook using the
-- service role (bypasses RLS) and are never hard-deleted (see deactivation
-- flow in actions/users.ts).

-- ---------------------------------------------------------------------------
-- roles / permissions / role_permissions / user_roles
-- ---------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

create policy roles_select_all on public.roles for select using (true);
create policy roles_update_manage on public.roles for update using (public.has_capability('roles.manage')) with check (public.has_capability('roles.manage'));

create policy permissions_select_all on public.permissions for select using (true);

create policy role_permissions_select_all on public.role_permissions for select using (true);
create policy role_permissions_write_manage on public.role_permissions for all
  using (public.has_capability('roles.manage')) with check (public.has_capability('roles.manage'));

create policy user_roles_select_self on public.user_roles for select using (user_id = public.current_profile_id());
create policy user_roles_select_manage on public.user_roles for select using (public.has_capability('roles.manage') or public.has_capability('users.manage'));
create policy user_roles_write_manage on public.user_roles for all
  using (public.has_capability('roles.manage')) with check (public.has_capability('roles.manage'));

-- Only a super admin may grant the super_admin role, and the final active
-- super_admin may never be demoted/deactivated (checked here + in
-- actions/users.ts so the UI can show a friendly error before hitting this).
create or replace function public.enforce_super_admin_safety_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining_super_admins integer;
begin
  if new.role = 'super_admin' and old.role is distinct from 'super_admin' and not public.is_super_admin() then
    raise exception 'Only a Super Admin may grant the Super Admin role.' using errcode = 'insufficient_privilege';
  end if;

  if old.role = 'super_admin' and new.role <> 'super_admin' then
    select count(*) into v_remaining_super_admins
    from public.profiles
    where role = 'super_admin' and account_status = 'active' and id <> old.id;
    if v_remaining_super_admins = 0 then
      raise exception 'Cannot remove the last active Super Admin.' using errcode = 'check_violation';
    end if;
  end if;

  if old.role = 'super_admin' and old.account_status = 'active' and new.account_status <> 'active' then
    select count(*) into v_remaining_super_admins
    from public.profiles
    where role = 'super_admin' and account_status = 'active' and id <> old.id;
    if v_remaining_super_admins = 0 then
      raise exception 'Cannot deactivate the last active Super Admin.' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_super_admin_safety_profiles
  before update on public.profiles
  for each row execute function public.enforce_super_admin_safety_profiles();

create or replace function public.enforce_super_admin_safety_user_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role_key = 'super_admin' and not public.is_super_admin() then
    raise exception 'Only a Super Admin may grant the Super Admin role.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_super_admin_safety_user_roles
  before insert on public.user_roles
  for each row execute function public.enforce_super_admin_safety_user_roles();

-- ---------------------------------------------------------------------------
-- site_settings / grade_levels / school_classes
-- ---------------------------------------------------------------------------
alter table public.site_settings enable row level security;
alter table public.grade_levels enable row level security;
alter table public.school_classes enable row level security;

create policy site_settings_select_all on public.site_settings for select using (true);
create policy site_settings_update_manage on public.site_settings for update
  using (public.has_capability('settings.manage')) with check (public.has_capability('settings.manage'));

create policy grade_levels_select_all on public.grade_levels for select using (true);
create policy grade_levels_write_manage on public.grade_levels for all
  using (public.has_capability('settings.manage')) with check (public.has_capability('settings.manage'));

create policy school_classes_select_all on public.school_classes for select using (true);
create policy school_classes_write_manage on public.school_classes for all
  using (public.has_capability('settings.manage')) with check (public.has_capability('settings.manage'));

-- Allow anon (signed-out visitors on /, /sign-in, /privacy, /terms) to read
-- branding-only settings and lookups; nothing here is sensitive.
grant select on public.site_settings, public.grade_levels, public.school_classes to anon;
