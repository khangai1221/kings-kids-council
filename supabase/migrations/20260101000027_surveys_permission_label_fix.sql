-- =============================================================================
-- 0027: surveys.manage's label mentioned "& polls" back when Polls was
-- planned as a subset of Surveys; Polls shipped as its own capability
-- (polls.manage, see 0026) so the label is corrected here.
-- =============================================================================

update public.permissions set label = 'Manage surveys' where key = 'surveys.manage';
