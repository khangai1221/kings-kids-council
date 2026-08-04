-- =============================================================================
-- 0024: rebrand default portal name to King's Kids Student Council
-- =============================================================================

alter table public.site_settings
  alter column portal_name set default 'King''s Kids Student Council';
