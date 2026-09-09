-- =============================================================================
-- 0029: bootstrap the founding Super Admin
--
-- One-off, explicitly requested. The `role` column is guarded by
-- enforce_profile_field_protection (migration 0016), which rejects a role
-- change unless the caller has `roles.manage` — impossible before the very
-- first admin exists. This migration briefly disables that trigger to seat
-- the first real admin, then re-enables it, and retires the seed placeholder
-- (`seed_placeholder_super_admin`) that made the demo data valid.
--
-- Idempotent: re-running promotes an already-super_admin (no-op) and only
-- deactivates the placeholder while it is still active. A no-op on any
-- database where that email never signed up.
-- =============================================================================

alter table public.profiles disable trigger trg_enforce_profile_field_protection;

update public.profiles
   set role = 'super_admin'
 where school_email = 'khangaijargalsaikhan@kingskids.mn';

update public.profiles
   set account_status = 'inactive',
       deactivated_at = coalesce(deactivated_at, now())
 where clerk_user_id = 'seed_placeholder_super_admin'
   and account_status = 'active';

alter table public.profiles enable trigger trg_enforce_profile_field_protection;
