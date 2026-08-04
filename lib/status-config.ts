/**
 * Central label + color mapping for every status enum in the app, so a
 * given status string always renders identically regardless of which page
 * shows it. Colors reference the semantic tokens from app/globals.css.
 */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "error";

export interface StatusConfigEntry {
  label: string;
  tone: StatusTone;
}

const entry = (label: string, tone: StatusTone): StatusConfigEntry => ({ label, tone });

export const STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  // generic / content
  draft: entry("Draft", "neutral"),
  published: entry("Published", "success"),
  archived: entry("Archived", "neutral"),
  scheduled: entry("Scheduled", "info"),
  closed: entry("Closed", "neutral"),
  expired: entry("Expired", "neutral"),

  // campaigns
  open: entry("Open", "success"),
  reviewing: entry("Reviewing", "info"),
  completed: entry("Completed", "success"),
  cancelled: entry("Cancelled", "error"),

  // applications
  submitted: entry("Submitted", "info"),
  under_review: entry("Under review", "info"),
  interview: entry("Interview", "warning"),
  accepted: entry("Accepted", "success"),
  waitlisted: entry("Waitlisted", "warning"),
  not_selected: entry("Not selected", "neutral"),
  withdrawn: entry("Withdrawn", "neutral"),

  // elections
  paused: entry("Paused", "warning"),
  results_published: entry("Results published", "success"),

  // events / registrations
  registration_open: entry("Registration open", "success"),
  registration_closed: entry("Registration closed", "neutral"),
  registered: entry("Registered", "success"),
  attended: entry("Attended", "success"),
  no_show: entry("No-show", "neutral"),

  // suggestions
  received: entry("Received", "info"),
  planned: entry("Planned", "info"),
  in_progress: entry("In progress", "warning"),
  implemented: entry("Implemented", "success"),
  unable_to_implement: entry("Unable to implement", "neutral"),
  spam: entry("Spam", "error"),

  // reviews
  assigned: entry("Assigned", "info"),
  declined: entry("Declined", "error"),

  // account
  active: entry("Active", "success"),
  inactive: entry("Inactive", "neutral"),
  suspended: entry("Suspended", "error"),
  pending: entry("Pending", "warning"),
};

export function getStatusConfig(status: string): StatusConfigEntry {
  return STATUS_CONFIG[status] ?? entry(status.replace(/_/g, " "), "neutral");
}
