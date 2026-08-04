/**
 * Shared string-literal enums mirroring the Postgres enum types created in
 * supabase/migrations. Keeping a single TypeScript source of truth here (and
 * a single SQL source of truth in the migrations) avoids typos drifting
 * between the two; tests/unit/enums.test.ts asserts the two stay in sync
 * with a lightweight snapshot list.
 */

export const FORM_KINDS = ["application", "survey", "event_registration", "other"] as const;
export type FormKind = (typeof FORM_KINDS)[number];

export const FORM_STATUSES = ["draft", "published", "closed", "archived"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "email",
  "number",
  "date",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "yes_no",
  "rating",
  "ranking",
  "agreement",
  "file_upload",
  "section_heading",
  "information_block",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "open",
  "closed",
  "reviewing",
  "completed",
  "archived",
  "cancelled",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "interview",
  "accepted",
  "waitlisted",
  "not_selected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ELECTION_STATUSES = [
  "draft",
  "scheduled",
  "open",
  "paused",
  "closed",
  "results_published",
  "cancelled",
  "archived",
] as const;
export type ElectionStatus = (typeof ELECTION_STATUSES)[number];

export const SURVEY_MODES = [
  "anonymous",
  "identified",
  "anonymous_with_participation_tracking",
] as const;
export type SurveyMode = (typeof SURVEY_MODES)[number];

export const SURVEY_STATUSES = ["draft", "scheduled", "open", "closed", "archived"] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

export const POLL_STATUSES = ["draft", "open", "closed", "archived"] as const;
export type PollStatus = (typeof POLL_STATUSES)[number];

export const EVENT_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "registration_open",
  "registration_closed",
  "completed",
  "cancelled",
  "archived",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_CATEGORY_DEFAULTS = [
  "Student Council",
  "Academic",
  "Sports",
  "Arts",
  "Clubs",
  "Community Service",
  "Competition",
  "Meeting",
  "School Holiday",
  "Other",
] as const;

export const EVENT_REGISTRATION_STATUSES = [
  "registered",
  "waitlisted",
  "cancelled",
  "attended",
  "no_show",
] as const;
export type EventRegistrationStatus = (typeof EVENT_REGISTRATION_STATUSES)[number];

export const SUGGESTION_IDENTITY_MODES = ["identified", "anonymous_to_council"] as const;
export type SuggestionIdentityMode = (typeof SUGGESTION_IDENTITY_MODES)[number];

export const SUGGESTION_STATUSES = [
  "received",
  "reviewing",
  "planned",
  "in_progress",
  "implemented",
  "unable_to_implement",
  "closed",
  "spam",
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];

export const SUGGESTION_CATEGORY_DEFAULTS = [
  "Events",
  "Clubs",
  "School facilities",
  "Student life",
  "Academic environment",
  "Cafeteria",
  "Community service",
  "Wellbeing",
  "Other",
] as const;

export const ANNOUNCEMENT_STATUSES = ["draft", "scheduled", "published", "expired", "archived"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_AUDIENCES = [
  "all_students",
  "selected_grades",
  "council_members",
  "reviewers",
  "admins",
  "custom",
] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const FAQ_STATUSES = ["draft", "published", "archived"] as const;
export type FaqStatus = (typeof FAQ_STATUSES)[number];

export const FAQ_CATEGORY_DEFAULTS = [
  "Student Council",
  "Applications",
  "Elections",
  "Events",
  "Suggestions",
  "Account and Login",
  "Privacy",
] as const;

export const NOTIFICATION_TYPES = [
  "application_submitted",
  "application_status_changed",
  "election_opened",
  "election_closing_soon",
  "election_results_published",
  "survey_opened",
  "event_updated",
  "event_cancelled",
  "event_registration_confirmed",
  "event_waitlist_promoted",
  "suggestion_response_received",
  "announcement_urgent",
  "general",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ACCOUNT_STATUSES = ["active", "inactive", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ONBOARDING_STATUSES = ["pending", "completed"] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const DEFAULT_GRADE_LEVELS = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export const DEFAULT_FILE_TYPES = ["pdf", "doc", "docx", "png", "jpg", "jpeg"] as const;

export const MAX_FILE_SIZE_BYTES_DEFAULT = 10 * 1024 * 1024; // 10 MB

export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  unauthorized: "/unauthorized",
  forbidden: "/forbidden",
  privacy: "/privacy",
  terms: "/terms",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  council: "/council",
  councilMembers: "/council/members",
  applications: "/applications",
  voting: "/voting",
  polls: "/polls",
  surveys: "/surveys",
  events: "/events",
  suggestions: "/suggestions",
  announcements: "/announcements",
  faq: "/faq",
  notifications: "/notifications",
  profile: "/profile",
  settings: "/settings",
  admin: "/admin",
} as const;

export const APP_TIMEZONE_FALLBACK = "Asia/Ulaanbaatar";
