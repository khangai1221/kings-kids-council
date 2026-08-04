-- =============================================================================
-- YM Student Council Portal — 0001: extensions and enum types
-- =============================================================================

create extension if not exists pgcrypto with schema public;
create extension if not exists citext with schema public;
create extension if not exists pg_trgm with schema public;

-- ---------------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------------
create type public.app_role as enum (
  'student',
  'council_member',
  'reviewer',
  'admin',
  'teacher_advisor',
  'super_admin'
);

create type public.account_status as enum ('active', 'inactive', 'suspended');
create type public.onboarding_status as enum ('pending', 'completed');
create type public.content_status as enum ('draft', 'published', 'archived');

-- ---------------------------------------------------------------------------
-- Forms
-- ---------------------------------------------------------------------------
create type public.form_kind as enum ('application', 'survey', 'event_registration', 'other');
create type public.form_status as enum ('draft', 'published', 'closed', 'archived');

create type public.question_type as enum (
  'short_text',
  'long_text',
  'email',
  'number',
  'date',
  'single_choice',
  'multiple_choice',
  'dropdown',
  'yes_no',
  'rating',
  'ranking',
  'agreement',
  'file_upload',
  'section_heading',
  'information_block'
);

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
create type public.campaign_status as enum (
  'draft', 'scheduled', 'open', 'closed', 'reviewing', 'completed', 'archived', 'cancelled'
);

create type public.application_status as enum (
  'draft', 'submitted', 'under_review', 'interview', 'accepted', 'waitlisted', 'not_selected', 'withdrawn'
);

create type public.review_recommendation as enum ('accept', 'waitlist', 'reject', 'needs_discussion');
create type public.review_assignment_status as enum ('assigned', 'in_progress', 'completed', 'declined');
create type public.review_status as enum ('draft', 'submitted');

-- ---------------------------------------------------------------------------
-- Elections
-- ---------------------------------------------------------------------------
create type public.election_status as enum (
  'draft', 'scheduled', 'open', 'paused', 'closed', 'results_published', 'cancelled', 'archived'
);
create type public.election_result_visibility as enum ('after_close', 'after_publish', 'manual');
create type public.election_turnout_visibility as enum ('hidden', 'visible_after_close', 'always_visible');
create type public.election_candidate_order_mode as enum ('alphabetical', 'random', 'manual');
create type public.election_candidate_approval as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- Surveys
-- ---------------------------------------------------------------------------
create type public.survey_mode as enum ('anonymous', 'identified', 'anonymous_with_participation_tracking');
create type public.survey_status as enum ('draft', 'scheduled', 'open', 'closed', 'archived');

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create type public.event_status as enum (
  'draft', 'scheduled', 'published', 'registration_open', 'registration_closed', 'completed', 'cancelled', 'archived'
);
create type public.event_visibility as enum ('public', 'restricted');
create type public.event_registration_status as enum ('registered', 'waitlisted', 'cancelled', 'attended', 'no_show');

-- ---------------------------------------------------------------------------
-- Suggestions
-- ---------------------------------------------------------------------------
create type public.suggestion_identity_mode as enum ('identified', 'anonymous_to_council');
create type public.suggestion_status as enum (
  'received', 'reviewing', 'planned', 'in_progress', 'implemented', 'unable_to_implement', 'closed', 'spam'
);
create type public.suggestion_author_type as enum ('admin', 'student');

-- ---------------------------------------------------------------------------
-- Announcements & FAQ
-- ---------------------------------------------------------------------------
create type public.announcement_status as enum ('draft', 'scheduled', 'published', 'expired', 'archived');
create type public.announcement_audience as enum (
  'all_students', 'selected_grades', 'council_members', 'reviewers', 'admins', 'custom'
);
create type public.faq_status as enum ('draft', 'published', 'archived');

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create type public.notification_type as enum (
  'application_submitted',
  'application_status_changed',
  'election_opened',
  'election_closing_soon',
  'election_results_published',
  'survey_opened',
  'event_updated',
  'event_cancelled',
  'event_registration_confirmed',
  'event_waitlist_promoted',
  'suggestion_response_received',
  'announcement_urgent',
  'general'
);
create type public.notification_delivery_status as enum ('pending', 'sent', 'failed', 'skipped');
