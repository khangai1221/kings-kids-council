-- =============================================================================
-- 0028: staff access requests
--
-- When someone signs up choosing "Teacher / staff" instead of "Student", the
-- sign-up form stashes `unsafeMetadata.staffAccessRequested = true` on the
-- Clerk user. The profile-sync path copies that into this timestamp. The
-- account still starts as a plain `student` with no elevated capability — an
-- admin reviews the request in /admin/users and grants a staff role manually.
-- The timestamp is cleared when the role is changed away from `student`
-- (see enforce_profile_field_protection below) or dismissed by an admin.
-- =============================================================================

alter table public.profiles
  add column staff_access_requested_at timestamptz;

comment on column public.profiles.staff_access_requested_at is
  'Set when the user self-identified as teacher/staff at sign-up. Does NOT grant any access; an admin still assigns the role. Cleared once role leaves student.';

create index idx_profiles_staff_request
  on public.profiles (staff_access_requested_at)
  where staff_access_requested_at is not null;

-- Fold the "clear the request once a staff role is assigned" rule into the
-- existing field-protection trigger function so it stays a single source of
-- truth for profile-column side effects.
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

  -- A pending staff request is resolved the moment the account stops being a
  -- plain student, whoever makes that change.
  if new.role is distinct from old.role and new.role <> 'student' then
    new.staff_access_requested_at := null;
  end if;

  return new;
end;
$$;
