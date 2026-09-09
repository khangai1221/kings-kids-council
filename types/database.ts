import type {
  AccountStatus,
  AnnouncementAudience,
  AnnouncementStatus,
  ApplicationStatus,
  CampaignStatus,
  ElectionStatus,
  EventRegistrationStatus,
  EventStatus,
  FaqStatus,
  FormKind,
  FormStatus,
  NotificationType,
  OnboardingStatus,
  PollStatus,
  QuestionType,
  SuggestionIdentityMode,
  SuggestionStatus,
  SurveyMode,
  SurveyStatus,
} from "@/lib/constants";
import type { Role } from "@/lib/permissions/roles";

/** Generic JSON value, matching Postgres jsonb. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ContentStatus = "draft" | "published" | "archived";
export type ReviewRecommendation = "accept" | "waitlist" | "reject" | "needs_discussion";
type ReviewAssignmentStatus = "assigned" | "in_progress" | "completed" | "declined";
type ReviewStatus = "draft" | "submitted";
type ElectionResultVisibility = "after_close" | "after_publish" | "manual";
type ElectionTurnoutVisibility = "hidden" | "visible_after_close" | "always_visible";
type ElectionCandidateOrderMode = "alphabetical" | "random" | "manual";
type ElectionCandidateApproval = "pending" | "approved" | "rejected";
type EventVisibility = "public" | "restricted";
type SuggestionAuthorType = "admin" | "student";
type NotificationDeliveryStatus = "pending" | "sent" | "failed" | "skipped";
export type FormConditionOperator = "equals" | "not_equals" | "contains" | "one_of" | "answered" | "not_answered";

/** Makes DB-defaulted columns optional on insert; everything else stays required. */
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Nullable columns can always be omitted on insert (Postgres defaults them to null). */
type NullableKeys<T> = { [K in keyof T]: null extends T[K] ? K : never }[keyof T];

/**
 * `Relationships` is required by @supabase/postgrest-js's `GenericTable`
 * constraint for generic inference to work at all (its absence silently
 * collapses `.from()`/`.insert()` types to `never`). We don't model
 * foreign-table embeds, so it's always an empty tuple here.
 */
type Table<Row, DefaultedKeys extends keyof Row> = {
  Row: Row;
  Insert: Optional<Row, DefaultedKeys | NullableKeys<Row>>;
  Update: Partial<Optional<Row, DefaultedKeys>>;
  Relationships: [];
};

// ---------------------------------------------------------------------------
// Identity & access
// ---------------------------------------------------------------------------
export type GradeLevelRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SchoolClassRow = {
  id: string;
  grade_level_id: string | null;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileRow = {
  id: string;
  clerk_user_id: string;
  school_email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  grade_level_id: string | null;
  school_class_id: string | null;
  graduation_year: number | null;
  role: Role;
  account_status: AccountStatus;
  onboarding_status: OnboardingStatus;
  accepted_rules_at: string | null;
  accepted_privacy_at: string | null;
  notification_in_app_default: boolean;
  notification_push_default: boolean;
  staff_access_requested_at: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
  deactivated_at: string | null;
}

export type RoleRow = {
  key: Role;
  label: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type PermissionRow = {
  key: string;
  label: string;
  description: string | null;
  category: string;
  created_at: string;
}

export type RolePermissionRow = {
  role_key: Role;
  permission_key: string;
  granted_at: string;
  granted_by: string | null;
}

export type UserRoleRow = {
  id: string;
  user_id: string;
  role_key: Role;
  granted_at: string;
  granted_by: string | null;
}

export type SiteSettingsRow = {
  singleton: true;
  portal_name: string;
  portal_logo_url: string | null;
  school_name: string;
  allowed_email_domain: string;
  primary_color: string;
  primary_color_dark: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  muted_text_color: string;
  success_color: string;
  warning_color: string;
  error_color: string;
  info_color: string;
  contact_email: string | null;
  academic_year: string;
  council_mission: string | null;
  privacy_notice: string | null;
  terms_content: string | null;
  notification_defaults: Json;
  min_reporting_privacy_threshold: number;
  file_upload_max_size_bytes: number;
  allowed_file_types: string[];
  timezone: string;
  updated_at: string;
  updated_by: string | null;
}

// ---------------------------------------------------------------------------
// Council
// ---------------------------------------------------------------------------
export type CouncilTermRow = {
  id: string;
  title: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export type CouncilPositionRow = {
  id: string;
  term_id: string | null;
  title: string;
  description: string | null;
  responsibilities: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CouncilMemberRow = {
  id: string;
  term_id: string;
  position_id: string | null;
  profile_id: string | null;
  display_name: string;
  photo_url: string | null;
  grade_level_label: string | null;
  short_bio: string | null;
  responsibilities: string | null;
  term_start: string | null;
  term_end: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
export type FormRow = {
  id: string;
  kind: FormKind;
  title: string;
  slug: string;
  description: string | null;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

export type FormVersionRow = {
  id: string;
  form_id: string;
  version_number: number;
  status: FormStatus;
  notes: string | null;
  published_at: string | null;
  created_at: string;
  created_by: string | null;
}

export type FormQuestionRow = {
  id: string;
  form_version_id: string;
  key: string;
  type: QuestionType;
  label: string;
  description: string | null;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  position: number;
  min_length: number | null;
  max_length: number | null;
  min_number: number | null;
  max_number: number | null;
  allowed_file_types: string[] | null;
  max_file_size_bytes: number | null;
  choice_allow_other: boolean;
  rating_scale: number | null;
  admin_notes: string | null;
  eligible_grade_level_ids: string[] | null;
  visible_for_position_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export type FormQuestionOptionRow = {
  id: string;
  question_id: string;
  value: string;
  label: string;
  position: number;
  is_other_option: boolean;
}

export type FormConditionRow = {
  id: string;
  question_id: string;
  depends_on_question_id: string;
  operator: FormConditionOperator;
  comparison_value: Json;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
export type ApplicationCampaignRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  academic_year: string | null;
  opening_at: string | null;
  closing_at: string | null;
  eligibility_requirements: string | null;
  eligible_grade_level_ids: string[] | null;
  form_version_id: string | null;
  review_rubric_id: string | null;
  status: CampaignStatus;
  confirmation_message: string | null;
  result_release_at: string | null;
  contact_email: string | null;
  allow_reapply: boolean;
  blind_review: boolean;
  withdrawal_deadline: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

export type ApplicationPositionRow = {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  responsibilities: string | null;
  eligibility: string | null;
  max_seats: number | null;
  requires_interview: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ApplicationSubmissionRow = {
  id: string;
  campaign_id: string;
  position_id: string;
  student_id: string;
  form_version_id: string;
  status: ApplicationStatus;
  progress_percent: number;
  submitted_at: string | null;
  returned_for_correction_reason: string | null;
  decision_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationAnswerRow = {
  id: string;
  submission_id: string;
  question_id: string;
  value_json: Json;
  file_record_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationStatusHistoryRow = {
  id: string;
  submission_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export type ReviewRubricRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type ReviewRubricItemRow = {
  id: string;
  rubric_id: string;
  label: string;
  description: string | null;
  weight: number;
  min_score: number;
  max_score: number;
  position: number;
}

export type ReviewAssignmentRow = {
  id: string;
  submission_id: string;
  reviewer_id: string;
  assigned_by: string | null;
  assigned_at: string;
  status: ReviewAssignmentStatus;
  conflict_of_interest: boolean;
  conflict_note: string | null;
}

export type ApplicationReviewRow = {
  id: string;
  assignment_id: string;
  submission_id: string;
  reviewer_id: string;
  recommendation: ReviewRecommendation | null;
  private_comments: string | null;
  interview_notes: string | null;
  internal_tags: string[] | null;
  status: ReviewStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ApplicationReviewScoreRow = {
  id: string;
  review_id: string;
  rubric_item_id: string;
  score: number;
  note: string | null;
}

export type ApplicationWeightedScoreRow = {
  submission_id: string;
  completed_reviews: number;
  weighted_average: number | null;
}

// ---------------------------------------------------------------------------
// Elections
// ---------------------------------------------------------------------------
export type ElectionRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  election_type: string;
  eligible_grade_level_ids: string[];
  opens_at: string;
  closes_at: string;
  status: ElectionStatus;
  result_visibility: ElectionResultVisibility;
  turnout_visibility: ElectionTurnoutVisibility;
  candidate_order_mode: ElectionCandidateOrderMode;
  instructions: string | null;
  confirmation_message: string | null;
  results_published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

export type ElectionPositionRow = {
  id: string;
  election_id: string;
  title: string;
  max_choices: number;
  sort_order: number;
}

export type ElectionCandidateRow = {
  id: string;
  election_position_id: string;
  student_id: string | null;
  candidate_name: string;
  grade_level_label: string | null;
  photo_url: string | null;
  statement: string | null;
  goals: string | null;
  campaign_document_file_id: string | null;
  approval_status: ElectionCandidateApproval;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ElectionEligibilityRow = {
  id: string;
  election_id: string;
  profile_id: string;
  is_eligible: boolean;
  reason: string | null;
  created_at: string;
}

export type ElectionResultRow = {
  position_id: string;
  position_title: string;
  candidate_id: string | null;
  candidate_name: string | null;
  vote_count: number;
  vote_percentage: number;
}

export type ElectionTurnoutRow = {
  total_eligible: number;
  total_votes: number;
  turnout_percentage: number;
}

// ---------------------------------------------------------------------------
// Surveys
// ---------------------------------------------------------------------------
export type SurveyRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  mode: SurveyMode;
  form_version_id: string | null;
  eligible_grade_level_ids: string[];
  opens_at: string | null;
  closes_at: string | null;
  allow_edit_before_close: boolean;
  show_live_results: boolean;
  show_results_after_submission: boolean;
  hide_results: boolean;
  limit_one_response: boolean;
  require_all_questions: boolean;
  randomize_choices: boolean;
  thank_you_message: string | null;
  status: SurveyStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

export type SurveyParticipationRow = {
  id: string;
  survey_id: string;
  student_id: string;
  participated_at: string;
}

export type SurveyResponseRow = {
  id: string;
  survey_id: string;
  student_id: string | null;
  submitted_at: string;
  created_at: string;
}

export type SurveyAnswerRow = {
  id: string;
  response_id: string;
  question_id: string;
  value_json: Json;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export type EventCategoryRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export type EventRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  cover_image_url: string | null;
  category_id: string | null;
  organizer: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  online_meeting_url: string | null;
  eligible_grade_level_ids: string[];
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  capacity: number | null;
  waitlist_capacity: number | null;
  rules: string | null;
  required_materials: string | null;
  competition_format: string | null;
  prizes: string | null;
  contact_info: string | null;
  registration_form_version_id: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  featured: boolean;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

export type EventAttachmentRow = {
  id: string;
  event_id: string;
  file_record_id: string;
  label: string | null;
  sort_order: number;
}

export type EventRegistrationRow = {
  id: string;
  event_id: string;
  student_id: string;
  status: EventRegistrationStatus;
  registered_at: string;
  cancelled_at: string | null;
  waitlist_position: number | null;
}

export type EventRegistrationAnswerRow = {
  id: string;
  registration_id: string;
  question_id: string;
  value_json: Json;
}

export type SavedEventRow = {
  id: string;
  event_id: string;
  student_id: string;
  saved_at: string;
}

export type EventAttendanceRow = {
  id: string;
  event_id: string;
  registration_id: string;
  attended: boolean;
  marked_by: string | null;
  marked_at: string | null;
}

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------
export type PollRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: PollStatus;
  opens_at: string | null;
  closes_at: string | null;
  eligible_grade_level_ids: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

export type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
}

export type PollVoteRow = {
  id: string;
  poll_id: string;
  option_id: string;
  student_id: string;
  voted_at: string;
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------
export type SuggestionCategoryRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export type SuggestionRow = {
  id: string;
  category_id: string | null;
  subject: string;
  message: string;
  proposed_solution: string | null;
  attachment_file_id: string | null;
  identity_mode: SuggestionIdentityMode;
  student_id: string | null;
  status: SuggestionStatus;
  assigned_to: string | null;
  is_published_to_ideas_board: boolean;
  published_summary: string | null;
  internal_tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export type SuggestionIdentityMappingRow = {
  id: string;
  suggestion_id: string;
  student_id: string;
  created_at: string;
}

export type SuggestionReplyRow = {
  id: string;
  suggestion_id: string;
  author_type: SuggestionAuthorType;
  author_id: string | null;
  message: string;
  created_at: string;
}

export type SuggestionInternalNoteRow = {
  id: string;
  suggestion_id: string;
  author_id: string;
  note: string;
  created_at: string;
}

export type SuggestionStatusHistoryRow = {
  id: string;
  suggestion_id: string;
  from_status: SuggestionStatus | null;
  to_status: SuggestionStatus;
  changed_by: string | null;
  changed_at: string;
}

// ---------------------------------------------------------------------------
// Announcements & FAQ
// ---------------------------------------------------------------------------
export type AnnouncementRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  cover_image_url: string | null;
  audience: AnnouncementAudience;
  eligible_grade_level_ids: string[] | null;
  custom_audience_user_ids: string[] | null;
  publish_at: string | null;
  expires_at: string | null;
  pinned: boolean;
  urgent: boolean;
  related_event_id: string | null;
  related_campaign_id: string | null;
  related_election_id: string | null;
  status: AnnouncementStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

export type AnnouncementReadRow = {
  id: string;
  announcement_id: string;
  student_id: string;
  read_at: string;
}

export type FaqCategoryRow = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export type FaqRow = {
  id: string;
  category_id: string | null;
  question: string;
  answer: string;
  sort_order: number;
  status: FaqStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
}

export type FaqFeedbackRow = {
  id: string;
  faq_id: string;
  student_id: string | null;
  is_helpful: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  delivery_status: NotificationDeliveryStatus;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

export type NotificationPreferencesRow = {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  category_overrides: Json;
  updated_at: string;
}

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  fcm_token: string;
  device_label: string | null;
  browser: string | null;
  enabled: boolean;
  created_at: string;
  last_used_at: string;
}

// ---------------------------------------------------------------------------
// Files, audit, rate limiting
// ---------------------------------------------------------------------------
export type FileRecordRow = {
  id: string;
  bucket: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  checksum: string | null;
  uploaded_by: string | null;
  purpose: string;
  created_at: string;
}

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  before_state: Json;
  after_state: Json;
  reason: string | null;
  request_metadata: Json;
  created_at: string;
}

export type RateLimitRecordRow = {
  id: string;
  bucket_key: string;
  window_start: string;
  request_count: number;
}

// ---------------------------------------------------------------------------
// Database interface (Tables map). Row/Insert/Update triplets are derived via
// `Table<Row, DefaultedKeys>` above so each table only lists ONE full shape.
// ---------------------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      grade_levels: Table<GradeLevelRow, "id" | "sort_order" | "is_active" | "created_at" | "updated_at">;
      school_classes: Table<SchoolClassRow, "id" | "sort_order" | "is_active" | "created_at" | "updated_at">;
      profiles: Table<
        ProfileRow,
        | "id"
        | "role"
        | "account_status"
        | "onboarding_status"
        | "notification_in_app_default"
        | "notification_push_default"
        | "created_at"
        | "updated_at"
      >;
      roles: Table<RoleRow, "is_system" | "created_at" | "updated_at">;
      permissions: Table<PermissionRow, "category" | "created_at">;
      role_permissions: Table<RolePermissionRow, "granted_at" | "granted_by">;
      user_roles: Table<UserRoleRow, "id" | "granted_at" | "granted_by">;
      site_settings: Table<
        SiteSettingsRow,
        | "portal_name"
        | "school_name"
        | "allowed_email_domain"
        | "primary_color"
        | "primary_color_dark"
        | "accent_color"
        | "background_color"
        | "surface_color"
        | "text_color"
        | "muted_text_color"
        | "success_color"
        | "warning_color"
        | "error_color"
        | "info_color"
        | "academic_year"
        | "notification_defaults"
        | "min_reporting_privacy_threshold"
        | "file_upload_max_size_bytes"
        | "allowed_file_types"
        | "timezone"
        | "updated_at"
      >;
      council_terms: Table<CouncilTermRow, "id" | "is_current" | "created_at" | "updated_at">;
      council_positions: Table<CouncilPositionRow, "id" | "sort_order" | "is_active" | "created_at" | "updated_at">;
      council_members: Table<
        CouncilMemberRow,
        "id" | "sort_order" | "status" | "created_at" | "updated_at" | "archived_at"
      >;
      forms: Table<FormRow, "id" | "status" | "created_at" | "updated_at" | "archived_at">;
      form_versions: Table<FormVersionRow, "id" | "status" | "created_at">;
      form_questions: Table<
        FormQuestionRow,
        "id" | "is_required" | "position" | "choice_allow_other" | "created_at" | "updated_at"
      >;
      form_question_options: Table<FormQuestionOptionRow, "id" | "position" | "is_other_option">;
      form_conditions: Table<FormConditionRow, "id" | "created_at">;
      application_campaigns: Table<
        ApplicationCampaignRow,
        "id" | "status" | "allow_reapply" | "blind_review" | "created_at" | "updated_at" | "archived_at"
      >;
      application_positions: Table<
        ApplicationPositionRow,
        "id" | "requires_interview" | "sort_order" | "created_at" | "updated_at"
      >;
      application_submissions: Table<
        ApplicationSubmissionRow,
        "id" | "status" | "progress_percent" | "created_at" | "updated_at"
      >;
      application_answers: Table<ApplicationAnswerRow, "id" | "value_json" | "created_at" | "updated_at">;
      application_status_history: Table<ApplicationStatusHistoryRow, "id" | "changed_at">;
      review_rubrics: Table<ReviewRubricRow, "id" | "created_at" | "updated_at">;
      review_rubric_items: Table<ReviewRubricItemRow, "id" | "weight" | "min_score" | "max_score" | "position">;
      review_assignments: Table<
        ReviewAssignmentRow,
        "id" | "assigned_at" | "status" | "conflict_of_interest"
      >;
      application_reviews: Table<ApplicationReviewRow, "id" | "status" | "created_at" | "updated_at">;
      application_review_scores: Table<ApplicationReviewScoreRow, "id">;
      elections: Table<
        ElectionRow,
        | "id"
        | "election_type"
        | "eligible_grade_level_ids"
        | "status"
        | "result_visibility"
        | "turnout_visibility"
        | "candidate_order_mode"
        | "created_at"
        | "updated_at"
        | "archived_at"
      >;
      election_positions: Table<ElectionPositionRow, "id" | "max_choices" | "sort_order">;
      election_candidates: Table<
        ElectionCandidateRow,
        "id" | "approval_status" | "sort_order" | "created_at" | "updated_at"
      >;
      election_eligibility: Table<ElectionEligibilityRow, "id" | "created_at">;
      surveys: Table<
        SurveyRow,
        | "id"
        | "mode"
        | "eligible_grade_level_ids"
        | "allow_edit_before_close"
        | "show_live_results"
        | "show_results_after_submission"
        | "hide_results"
        | "limit_one_response"
        | "require_all_questions"
        | "randomize_choices"
        | "status"
        | "created_at"
        | "updated_at"
        | "archived_at"
      >;
      survey_participation: Table<SurveyParticipationRow, "id" | "participated_at">;
      survey_responses: Table<SurveyResponseRow, "id" | "submitted_at" | "created_at">;
      survey_answers: Table<SurveyAnswerRow, "id" | "value_json">;
      event_categories: Table<EventCategoryRow, "id" | "sort_order" | "is_active">;
      events: Table<
        EventRow,
        | "id"
        | "eligible_grade_level_ids"
        | "status"
        | "visibility"
        | "featured"
        | "created_at"
        | "updated_at"
        | "archived_at"
      >;
      event_attachments: Table<EventAttachmentRow, "id" | "sort_order">;
      event_registrations: Table<EventRegistrationRow, "id" | "status" | "registered_at">;
      event_registration_answers: Table<EventRegistrationAnswerRow, "id" | "value_json">;
      saved_events: Table<SavedEventRow, "id" | "saved_at">;
      event_attendance: Table<EventAttendanceRow, "id" | "attended">;
      polls: Table<
        PollRow,
        | "id"
        | "eligible_grade_level_ids"
        | "status"
        | "created_at"
        | "updated_at"
        | "archived_at"
      >;
      poll_options: Table<PollOptionRow, "id" | "sort_order">;
      poll_votes: Table<PollVoteRow, "id" | "voted_at">;
      suggestion_categories: Table<SuggestionCategoryRow, "id" | "sort_order" | "is_active">;
      suggestions: Table<
        SuggestionRow,
        | "id"
        | "identity_mode"
        | "status"
        | "is_published_to_ideas_board"
        | "created_at"
        | "updated_at"
      >;
      suggestion_identity_mappings: Table<SuggestionIdentityMappingRow, "id" | "created_at">;
      suggestion_replies: Table<SuggestionReplyRow, "id" | "created_at">;
      suggestion_internal_notes: Table<SuggestionInternalNoteRow, "id" | "created_at">;
      suggestion_status_history: Table<SuggestionStatusHistoryRow, "id" | "changed_at">;
      announcements: Table<
        AnnouncementRow,
        | "id"
        | "audience"
        | "pinned"
        | "urgent"
        | "status"
        | "created_at"
        | "updated_at"
        | "archived_at"
      >;
      announcement_reads: Table<AnnouncementReadRow, "id" | "read_at">;
      faq_categories: Table<FaqCategoryRow, "id" | "sort_order" | "is_active">;
      faqs: Table<FaqRow, "id" | "sort_order" | "status" | "created_at" | "updated_at" | "archived_at">;
      faq_feedback: Table<FaqFeedbackRow, "id" | "created_at">;
      notifications: Table<
        NotificationRow,
        "id" | "type" | "is_read" | "delivery_status" | "created_at"
      >;
      notification_preferences: Table<
        NotificationPreferencesRow,
        "id" | "in_app_enabled" | "push_enabled" | "category_overrides" | "updated_at"
      >;
      push_subscriptions: Table<PushSubscriptionRow, "id" | "enabled" | "created_at" | "last_used_at">;
      file_records: Table<FileRecordRow, "id" | "created_at">;
      audit_logs: Table<AuditLogRow, "id" | "created_at">;
      rate_limit_records: Table<RateLimitRecordRow, "id" | "request_count">;
    };
    Views: {
      application_weighted_scores: {
        Row: ApplicationWeightedScoreRow;
        Relationships: [];
      };
    };
    Functions: {
      current_profile_id: { Args: Record<string, never>; Returns: string };
      current_effective_roles: { Args: Record<string, never>; Returns: string[] };
      current_primary_role: { Args: Record<string, never>; Returns: Role };
      has_capability: { Args: { capability_key: string }; Returns: boolean };
      list_current_capabilities: { Args: Record<string, never>; Returns: string[] };
      is_admin_tier: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      cast_election_vote: { Args: { p_election_id: string; p_ballot: Json }; Returns: Json };
      get_election_results: { Args: { p_election_id: string }; Returns: ElectionResultRow[] };
      get_election_turnout: { Args: { p_election_id: string }; Returns: ElectionTurnoutRow[] };
      has_voted_for_position: { Args: { p_election_position_id: string }; Returns: boolean };
      submit_survey_response: { Args: { p_survey_id: string; p_answers: Json }; Returns: string };
      register_for_event: { Args: { p_event_id: string; p_answers: Json }; Returns: Json };
      cancel_event_registration: { Args: { p_registration_id: string }; Returns: string | null };
      promote_event_registration: { Args: { p_registration_id: string }; Returns: undefined };
      cast_poll_vote: { Args: { p_poll_id: string; p_option_id: string }; Returns: Json };
      get_poll_option_counts: { Args: { p_poll_id: string }; Returns: { option_id: string; votes: number }[] };
      submit_suggestion: {
        Args: {
          p_category_id: string | null;
          p_subject: string;
          p_message: string;
          p_proposed_solution: string | null;
          p_attachment_file_id: string | null;
          p_identity_mode: SuggestionIdentityMode;
        };
        Returns: string;
      };
      reveal_suggestion_identity: {
        Args: { p_suggestion_id: string; p_reason: string };
        Returns: { student_id: string; display_name: string | null; school_email: string }[];
      };
      create_notification: {
        Args: {
          p_user_id: string;
          p_type: NotificationType;
          p_title: string;
          p_message: string;
          p_link?: string | null;
          p_related_entity_type?: string | null;
          p_related_entity_id?: string | null;
        };
        Returns: string;
      };
      mark_notification_delivery: {
        Args: { p_id: string; p_status: NotificationDeliveryStatus };
        Returns: undefined;
      };
      check_rate_limit: {
        Args: { p_bucket_key: string; p_window_seconds: number; p_max_requests: number };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
