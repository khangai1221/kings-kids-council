-- =============================================================================
-- 0029: bootstrap the founding Super Admin
--
-- One-off, explicitly requested. Two BEFORE UPDATE triggers on public.profiles
-- guard the role column:
--   * enforce_profile_field_protection    (0016) — needs roles.manage
--   * enforce_super_admin_safety_profiles  (0016) — needs is_super_admin()
-- Neither can pass before the very first admin exists, so this migration
-- briefly disables both, seats the first real admin, retires the seed
-- placeholder (`seed_placeholder_super_admin`), then re-enables them.
--
-- Order matters: promote the new admin FIRST so there are two active
-- super_admins before the placeholder is deactivated (the safety trigger
-- forbids removing the last one).
--
-- Idempotent: promoting an already-super_admin is a no-op; the placeholder is
-- only deactivated while still active; a no-op on any database where that
-- email never signed up.
-- =============================================================================

alter table public.profiles disable trigger trg_enforce_profile_field_protection;
alter table public.profiles disable trigger trg_enforce_super_admin_safety_profiles;

update public.profiles
   set role = 'super_admin'
 where school_email = 'khangaijargalsaikhan@kingskids.mn';

update public.profiles
   set account_status = 'inactive',
       deactivated_at = coalesce(deactivated_at, now())
 where clerk_user_id = 'seed_placeholder_super_admin'
   and account_status = 'active';

alter table public.profiles enable trigger trg_enforce_super_admin_safety_profiles;
alter table public.profiles enable trigger trg_enforce_profile_field_protection;
