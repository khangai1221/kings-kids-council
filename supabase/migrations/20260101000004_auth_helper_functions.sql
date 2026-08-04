-- =============================================================================
-- 0004: auth helper functions used throughout RLS policies
--
-- These are SECURITY DEFINER + STABLE so that (a) RLS policies on `profiles`
-- itself don't recurse through RLS when resolving the caller's own row, and
-- (b) Postgres can cache the result within a single statement. `search_path`
-- is pinned to prevent search-path hijacking in SECURITY DEFINER functions.
-- =============================================================================

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '');
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where clerk_user_id = public.current_clerk_user_id();
$$;

create or replace function public.current_primary_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where clerk_user_id = public.current_clerk_user_id();
$$;

-- Primary role plus any supplementary roles granted via user_roles.
create or replace function public.current_effective_roles()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(distinct role_key)
      from (
        select role::text as role_key
        from public.profiles
        where clerk_user_id = public.current_clerk_user_id()
        union
        select ur.role_key
        from public.user_roles ur
        join public.profiles p on p.id = ur.user_id
        where p.clerk_user_id = public.current_clerk_user_id()
      ) roles
    ),
    array[]::text[]
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select 'super_admin' = any(public.current_effective_roles());
$$;

create or replace function public.is_admin_tier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_effective_roles() && array['admin', 'teacher_advisor', 'super_admin'];
$$;

create or replace function public.has_capability(capability_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.role_permissions rp
      where rp.permission_key = capability_key
        and rp.role_key = any(public.current_effective_roles())
    );
$$;

comment on function public.has_capability(text) is
  'Server-side and RLS-side capability check mirroring lib/permissions/capabilities.ts#can(). Keep both in sync.';

-- Full set of capabilities for the caller's effective roles, used by the app
-- to render nav/UI without issuing one has_capability() round trip per key.
create or replace function public.list_current_capabilities()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_super_admin()
    then (select array_agg(key) from public.permissions)
    else coalesce(
      (select array_agg(distinct rp.permission_key) from public.role_permissions rp where rp.role_key = any(public.current_effective_roles())),
      array[]::text[]
    )
  end;
$$;

grant execute on function public.current_effective_roles() to authenticated;
grant execute on function public.current_primary_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_admin_tier() to authenticated;
grant execute on function public.has_capability(text) to authenticated;
grant execute on function public.list_current_capabilities() to authenticated;
