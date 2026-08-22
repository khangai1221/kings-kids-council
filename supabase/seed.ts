/**
 * One-time test-data seed for a freshly wiped database.
 *
 * Inserts one realistic, connected row per feature so every page in the app
 * shows real content. Uses the Supabase service-role REST client (bypasses
 * RLS) — never a direct Postgres connection, which isn't reachable from this
 * sandbox.
 *
 * Run with: pnpm db:seed
 *
 * IMPORTANT: does not modify the existing real super_admin profile
 * (id 1caa3876-a739-4aff-9cc2-ffd837e3affe). All other profiles inserted
 * here are synthetic (fake clerk_user_id) DB rows only, not real logins.
 */

import { config } from "dotenv";
config();

import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env",
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ADMIN_ID = "1caa3876-a739-4aff-9cc2-ffd837e3affe";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function insertOne<T = { id: string }>(
  table: string,
  row: Record<string, unknown>,
  label?: string,
): Promise<T> {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) {
    console.error(`\n✗ FAILED inserting into ${table}${label ? ` (${label})` : ""}`);
    console.error("  row:", JSON.stringify(row, null, 2));
    console.error("  error:", error.message, error.details ?? "");
    throw error;
  }
  console.log(`✓ ${table}${label ? ` — ${label}` : ""}`);
  return data as T;
}

async function insertMany<T = { id: string }>(
  table: string,
  rows: Record<string, unknown>[],
  label?: string,
): Promise<T[]> {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) {
    console.error(`\n✗ FAILED inserting into ${table}${label ? ` (${label})` : ""}`);
    console.error("  rows:", JSON.stringify(rows, null, 2));
    console.error("  error:", error.message, error.details ?? "");
    throw error;
  }
  console.log(`✓ ${table} x${data?.length ?? 0}${label ? ` — ${label}` : ""}`);
  return data as T[];
}

async function updateOne(
  table: string,
  match: Record<string, unknown>,
  patch: Record<string, unknown>,
  label?: string,
) {
  const { error } = await supabase.from(table).update(patch).match(match);
  if (error) {
    console.error(`\n✗ FAILED updating ${table}${label ? ` (${label})` : ""}`);
    console.error("  error:", error.message, error.details ?? "");
    throw error;
  }
  console.log(`✓ updated ${table}${label ? ` — ${label}` : ""}`);
}

async function fetchLookup(
  table: string,
  keyCol: string,
  keys: string[],
  select = "id,key",
): Promise<Record<string, string>> {
  const { data, error } = await supabase.from(table).select(select).in(keyCol, keys);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data as unknown as Record<string, string>[]) map[row[keyCol]] = row.id;
  return map;
}

async function main() {
  console.log("Seeding King's Kids Student Council portal test data...\n");

  // ---------------------------------------------------------------------
  // Lookups already seeded by migrations
  // ---------------------------------------------------------------------
  const grades = await fetchLookup("grade_levels", "key", [
    "grade_10",
    "grade_11",
    "grade_12",
  ]);
  const eventCategories = await fetchLookup("event_categories", "key", [
    "student_council",
    "competition",
  ]);
  const suggestionCategories = await fetchLookup("suggestion_categories", "key", [
    "cafeteria",
  ]);
  const faqCategories = await fetchLookup("faq_categories", "key", ["applications"]);

  // ---------------------------------------------------------------------
  // school_classes (lookup table, currently empty — add a few for realism)
  // ---------------------------------------------------------------------
  const classes = await insertMany<{ id: string; key: string }>(
    "school_classes",
    [
      { grade_level_id: grades.grade_10, key: "grade_10_a", label: "10A", sort_order: 1 },
      { grade_level_id: grades.grade_11, key: "grade_11_a", label: "11A", sort_order: 2 },
      { grade_level_id: grades.grade_12, key: "grade_12_a", label: "12A", sort_order: 3 },
    ],
    "school_classes",
  );
  const class10 = classes.find((c) => c.key === "grade_10_a")!.id;
  const class11 = classes.find((c) => c.key === "grade_11_a")!.id;
  const class12 = classes.find((c) => c.key === "grade_12_a")!.id;

  // ---------------------------------------------------------------------
  // profiles — 3 synthetic students, reused across every feature below.
  // Never touching the real super_admin profile.
  // ---------------------------------------------------------------------
  const student1Name = faker.person.fullName();
  const student2Name = faker.person.fullName();
  const student3Name = faker.person.fullName();

  const student1 = await insertOne<{ id: string; display_name: string }>(
    "profiles",
    {
      clerk_user_id: "seed_student_001",
      school_email: `${faker.internet.username({ firstName: student1Name.split(" ")[0] })}.s1@kingskids.mn`.toLowerCase(),
      first_name: student1Name.split(" ")[0],
      last_name: student1Name.split(" ").slice(1).join(" ") || "Student",
      display_name: student1Name,
      grade_level_id: grades.grade_10,
      school_class_id: class10,
      role: "student",
      account_status: "active",
      onboarding_status: "completed",
      accepted_rules_at: daysFromNow(-60),
      accepted_privacy_at: daysFromNow(-60),
    },
    "student_001",
  );

  const student2 = await insertOne<{ id: string; display_name: string }>(
    "profiles",
    {
      clerk_user_id: "seed_student_002",
      school_email: `${faker.internet.username({ firstName: student2Name.split(" ")[0] })}.s2@kingskids.mn`.toLowerCase(),
      first_name: student2Name.split(" ")[0],
      last_name: student2Name.split(" ").slice(1).join(" ") || "Student",
      display_name: student2Name,
      grade_level_id: grades.grade_11,
      school_class_id: class11,
      role: "council_member",
      account_status: "active",
      onboarding_status: "completed",
      accepted_rules_at: daysFromNow(-90),
      accepted_privacy_at: daysFromNow(-90),
    },
    "student_002 (council member)",
  );

  const student3 = await insertOne<{ id: string; display_name: string }>(
    "profiles",
    {
      clerk_user_id: "seed_student_003",
      school_email: `${faker.internet.username({ firstName: student3Name.split(" ")[0] })}.s3@kingskids.mn`.toLowerCase(),
      first_name: student3Name.split(" ")[0],
      last_name: student3Name.split(" ").slice(1).join(" ") || "Student",
      display_name: student3Name,
      grade_level_id: grades.grade_12,
      school_class_id: class12,
      role: "student",
      account_status: "active",
      onboarding_status: "completed",
      accepted_rules_at: daysFromNow(-45),
      accepted_privacy_at: daysFromNow(-45),
    },
    "student_003",
  );

  // Supplementary role: student_002 is also a reviewer for this cycle.
  await insertOne(
    "user_roles",
    { user_id: student2.id, role_key: "reviewer", granted_by: ADMIN_ID },
    "student_002 granted supplementary reviewer role",
  );

  // ---------------------------------------------------------------------
  // Council terms / positions / members
  // ---------------------------------------------------------------------
  const term = await insertOne(
    "council_terms",
    {
      title: "2025–2026 Student Council Term",
      academic_year: "2025-2026",
      start_date: "2025-09-01",
      end_date: "2026-06-15",
      is_current: true,
    },
    "current term",
  );

  const councilPosition = await insertOne(
    "council_positions",
    {
      term_id: term.id,
      title: "Vice President",
      description: "Supports the President and leads cross-committee coordination.",
      responsibilities: "Chairs weekly committee sync, deputizes for the President.",
      sort_order: 1,
      is_active: true,
    },
    "Vice President",
  );

  await insertOne(
    "council_members",
    {
      term_id: term.id,
      position_id: councilPosition.id,
      profile_id: student2.id,
      display_name: student2.display_name,
      grade_level_label: "Grade 11",
      short_bio: faker.lorem.sentences(2),
      responsibilities: "Chairs weekly committee sync, deputizes for the President.",
      term_start: "2025-09-01",
      term_end: "2026-06-15",
      sort_order: 1,
      status: "published",
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "council member card",
  );

  // ---------------------------------------------------------------------
  // Forms: application, survey, event_registration
  // ---------------------------------------------------------------------

  // --- Form A: application ---
  const formA = await insertOne(
    "forms",
    {
      kind: "application",
      title: "Student Council Application Form",
      slug: "council-application-2026",
      description: "Standard application form for council positions.",
      status: "draft",
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "Form A (application)",
  );
  const formAVersion = await insertOne(
    "form_versions",
    { form_id: formA.id, version_number: 1, status: "draft", created_by: ADMIN_ID },
    "Form A v1",
  );
  const qMotivation = await insertOne(
    "form_questions",
    {
      form_version_id: formAVersion.id,
      key: "motivation",
      type: "long_text",
      label: "Why do you want to join the student council?",
      is_required: true,
      position: 0,
    },
    "Q: motivation",
  );
  const qGrade = await insertOne(
    "form_questions",
    {
      form_version_id: formAVersion.id,
      key: "grade_choice",
      type: "single_choice",
      label: "Which grade are you applying from?",
      is_required: true,
      position: 1,
    },
    "Q: grade choice",
  );
  await insertMany(
    "form_question_options",
    [
      { question_id: qGrade.id, value: "grade_10", label: "Grade 10", position: 0 },
      { question_id: qGrade.id, value: "grade_11", label: "Grade 11", position: 1 },
      { question_id: qGrade.id, value: "grade_12", label: "Grade 12", position: 2 },
    ],
    "grade choice options",
  );
  const qPriorLeadership = await insertOne(
    "form_questions",
    {
      form_version_id: formAVersion.id,
      key: "prior_leadership",
      type: "short_text",
      label: "If Grade 12, list any prior leadership roles",
      is_required: false,
      position: 2,
    },
    "Q: prior leadership (conditional)",
  );
  await insertOne(
    "form_conditions",
    {
      question_id: qPriorLeadership.id,
      depends_on_question_id: qGrade.id,
      operator: "equals",
      comparison_value: "grade_12",
    },
    "condition on prior leadership",
  );
  await updateOne(
    "form_versions",
    { id: formAVersion.id },
    { status: "published", published_at: daysFromNow(-14) },
    "Form A v1 -> published",
  );
  await updateOne("forms", { id: formA.id }, { status: "published" }, "Form A -> published");

  // --- Form B: survey ---
  const formB = await insertOne(
    "forms",
    {
      kind: "survey",
      title: "Council Feedback Survey Form",
      slug: "council-feedback-survey-2026",
      description: "Gathers feedback on council communication.",
      status: "draft",
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "Form B (survey)",
  );
  const formBVersion = await insertOne(
    "form_versions",
    { form_id: formB.id, version_number: 1, status: "draft", created_by: ADMIN_ID },
    "Form B v1",
  );
  const qSatisfaction = await insertOne(
    "form_questions",
    {
      form_version_id: formBVersion.id,
      key: "satisfaction",
      type: "rating",
      label: "How satisfied are you with council communication this term?",
      is_required: true,
      rating_scale: 5,
      position: 0,
    },
    "Q: satisfaction rating",
  );
  await updateOne(
    "form_versions",
    { id: formBVersion.id },
    { status: "published", published_at: daysFromNow(-3) },
    "Form B v1 -> published",
  );
  await updateOne("forms", { id: formB.id }, { status: "published" }, "Form B -> published");

  // --- Form C: event registration ---
  const formC = await insertOne(
    "forms",
    {
      kind: "event_registration",
      title: "General Event Registration Form",
      slug: "event-registration-general",
      description: "Default registration questionnaire for events.",
      status: "draft",
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "Form C (event registration)",
  );
  const formCVersion = await insertOne(
    "form_versions",
    { form_id: formC.id, version_number: 1, status: "draft", created_by: ADMIN_ID },
    "Form C v1",
  );
  const qDietary = await insertOne(
    "form_questions",
    {
      form_version_id: formCVersion.id,
      key: "dietary_restrictions",
      type: "short_text",
      label: "Any dietary restrictions or accessibility needs?",
      is_required: false,
      position: 0,
    },
    "Q: dietary restrictions",
  );
  await updateOne(
    "form_versions",
    { id: formCVersion.id },
    { status: "published", published_at: daysFromNow(-20) },
    "Form C v1 -> published",
  );
  await updateOne("forms", { id: formC.id }, { status: "published" }, "Form C -> published");

  // ---------------------------------------------------------------------
  // Applications: rubric, campaign, position, submission, answers, review
  // ---------------------------------------------------------------------
  const rubric = await insertOne(
    "review_rubrics",
    {
      title: "Student Council Application Rubric",
      description: "Standard scoring rubric for council applications.",
      created_by: ADMIN_ID,
    },
    "rubric",
  );
  const rubricItems = await insertMany<{ id: string; label: string }>(
    "review_rubric_items",
    [
      {
        rubric_id: rubric.id,
        label: "Leadership Potential",
        description: "Demonstrated initiative and leadership experience.",
        weight: 1,
        min_score: 0,
        max_score: 5,
        position: 0,
      },
      {
        rubric_id: rubric.id,
        label: "Communication Skills",
        description: "Clarity and thoughtfulness of written responses.",
        weight: 1,
        min_score: 0,
        max_score: 5,
        position: 1,
      },
    ],
    "rubric items",
  );
  const itemLeadership = rubricItems.find((i) => i.label === "Leadership Potential")!;
  const itemCommunication = rubricItems.find((i) => i.label === "Communication Skills")!;

  const campaign = await insertOne(
    "application_campaigns",
    {
      title: "Fall 2025 Council Applications",
      slug: "fall-2025-council-applications",
      description: "Open call for new student council representatives.",
      academic_year: "2025-2026",
      opening_at: daysFromNow(-21),
      closing_at: daysFromNow(-3),
      eligibility_requirements: "Open to students in Grades 10–12 with a clean discipline record.",
      eligible_grade_level_ids: [grades.grade_10, grades.grade_11, grades.grade_12],
      form_version_id: formAVersion.id,
      review_rubric_id: rubric.id,
      status: "reviewing",
      confirmation_message: "Thanks for applying! You'll hear back within two weeks.",
      result_release_at: daysFromNow(7),
      contact_email: "studentcouncil@kingskids.mn",
      allow_reapply: false,
      blind_review: true,
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "application campaign",
  );

  const appPosition = await insertOne(
    "application_positions",
    {
      campaign_id: campaign.id,
      title: "Grade Representative",
      description: "Represents your grade's interests at council meetings.",
      responsibilities: "Attend biweekly meetings, gather peer feedback, report back to homeroom.",
      eligibility: "Grades 10-12",
      max_seats: 2,
      requires_interview: true,
      sort_order: 0,
    },
    "application position",
  );

  const submission = await insertOne(
    "application_submissions",
    {
      campaign_id: campaign.id,
      position_id: appPosition.id,
      student_id: student1.id,
      form_version_id: formAVersion.id,
      status: "under_review",
      progress_percent: 100,
      submitted_at: daysFromNow(-5),
    },
    "application submission (student_001)",
  );

  await insertMany(
    "application_answers",
    [
      {
        submission_id: submission.id,
        question_id: qMotivation.id,
        value_json: faker.lorem.paragraph(),
      },
      {
        submission_id: submission.id,
        question_id: qGrade.id,
        value_json: "grade_10",
      },
    ],
    "application answers",
  );

  const reviewAssignment = await insertOne(
    "review_assignments",
    {
      submission_id: submission.id,
      reviewer_id: ADMIN_ID,
      assigned_by: ADMIN_ID,
      status: "completed",
    },
    "review assignment",
  );

  const review = await insertOne(
    "application_reviews",
    {
      assignment_id: reviewAssignment.id,
      submission_id: submission.id,
      reviewer_id: ADMIN_ID,
      recommendation: "accept",
      private_comments: faker.lorem.sentences(2),
      internal_tags: ["strong-candidate"],
      status: "submitted",
      submitted_at: daysFromNow(-2),
    },
    "application review",
  );

  await insertMany(
    "application_review_scores",
    [
      { review_id: review.id, rubric_item_id: itemLeadership.id, score: 4, note: "Solid examples of prior initiative." },
      { review_id: review.id, rubric_item_id: itemCommunication.id, score: 5, note: "Very clear and thoughtful writing." },
    ],
    "review scores",
  );

  // ---------------------------------------------------------------------
  // Elections — insert positions/candidates while status='draft' (the
  // immutability trigger blocks candidate writes once status leaves
  // draft/scheduled/paused), then flip to 'open' and record a vote by
  // direct insert (the cast_election_vote RPC relies on JWT claims that
  // don't exist for service-role calls).
  // ---------------------------------------------------------------------
  const election = await insertOne(
    "elections",
    {
      title: "Student Council Officer Elections 2026",
      slug: "officer-elections-2026",
      description: "Vote for your Head Prefect for the 2025-2026 term.",
      election_type: "general",
      eligible_grade_level_ids: [grades.grade_10, grades.grade_11, grades.grade_12],
      opens_at: daysFromNow(-10),
      closes_at: daysFromNow(-1),
      status: "draft",
      result_visibility: "after_close",
      turnout_visibility: "visible_after_close",
      candidate_order_mode: "alphabetical",
      instructions: "Select one candidate for Head Prefect.",
      confirmation_message: "Your vote has been recorded. Thank you for participating!",
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "election (draft, so positions/candidates can be added)",
  );

  const electionPosition = await insertOne(
    "election_positions",
    { election_id: election.id, title: "Head Prefect", max_choices: 1, sort_order: 0 },
    "election position",
  );

  const candidate1 = await insertOne(
    "election_candidates",
    {
      election_position_id: electionPosition.id,
      student_id: student2.id,
      candidate_name: student2.display_name,
      grade_level_label: "Grade 11",
      statement: faker.lorem.sentences(2),
      goals: faker.lorem.sentences(2),
      approval_status: "approved",
      sort_order: 0,
    },
    "candidate 1 (student_002)",
  );

  await insertOne(
    "election_candidates",
    {
      election_position_id: electionPosition.id,
      student_id: null,
      candidate_name: faker.person.fullName(),
      grade_level_label: "Grade 12",
      statement: faker.lorem.sentences(2),
      goals: faker.lorem.sentences(2),
      approval_status: "approved",
      sort_order: 1,
    },
    "candidate 2 (unlinked)",
  );

  // Can't transition to 'open'/'results_published' via direct update: a
  // trigger (trg_enforce_election_publish_transition) requires the
  // elections.publish capability, which is JWT-derived and unavailable to
  // service-role calls. 'closed' isn't gated, and with opens_at/closes_at
  // already in the past plus result_visibility='after_close' it reads as a
  // realistic completed election with results already viewable.
  await updateOne("elections", { id: election.id }, { status: "closed" }, "election -> closed");

  await insertOne(
    "election_participation",
    { election_id: election.id, election_position_id: electionPosition.id, student_id: student1.id },
    "election participation (student_001)",
  );
  const ballot = await insertOne(
    "election_ballots",
    { election_position_id: electionPosition.id },
    "ballot",
  );
  await insertOne(
    "election_ballot_choices",
    { ballot_id: ballot.id, candidate_id: candidate1.id },
    "ballot choice (voted for candidate 1)",
  );

  // ---------------------------------------------------------------------
  // Surveys — direct inserts mirroring what submit_survey_response() does
  // ---------------------------------------------------------------------
  const survey = await insertOne(
    "surveys",
    {
      title: "Council Communication Feedback",
      slug: "council-communication-feedback-2026",
      description: "Help us understand how well council updates reach students.",
      mode: "identified",
      form_version_id: formBVersion.id,
      eligible_grade_level_ids: [],
      opens_at: daysFromNow(-3),
      closes_at: daysFromNow(4),
      show_live_results: true,
      show_results_after_submission: true,
      limit_one_response: true,
      require_all_questions: true,
      thank_you_message: "Thanks for your feedback!",
      status: "open",
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "survey",
  );
  await insertOne(
    "survey_participation",
    { survey_id: survey.id, student_id: student1.id },
    "survey participation (student_001)",
  );
  const surveyResponse = await insertOne(
    "survey_responses",
    { survey_id: survey.id, student_id: student1.id, submitted_at: daysFromNow(-1) },
    "survey response",
  );
  await insertOne(
    "survey_answers",
    { response_id: surveyResponse.id, question_id: qSatisfaction.id, value_json: 4 },
    "survey answer",
  );

  // ---------------------------------------------------------------------
  // Polls
  // ---------------------------------------------------------------------
  const poll = await insertOne(
    "polls",
    {
      title: "Next Spirit Week Theme",
      slug: "next-spirit-week-theme",
      description: "Pick the theme for our upcoming Spirit Week!",
      status: "open",
      opens_at: daysFromNow(-1),
      closes_at: daysFromNow(6),
      eligible_grade_level_ids: [],
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "poll",
  );
  const pollOptions = await insertMany(
    "poll_options",
    [
      { poll_id: poll.id, label: "Decades Day", sort_order: 0 },
      { poll_id: poll.id, label: "Superheroes", sort_order: 1 },
      { poll_id: poll.id, label: "Cultural Festival", sort_order: 2 },
    ],
    "poll options",
  );
  await insertOne(
    "poll_votes",
    { poll_id: poll.id, option_id: pollOptions[0].id, student_id: student1.id },
    "poll vote (student_001)",
  );

  // ---------------------------------------------------------------------
  // Events — one completed regular event, one upcoming competition
  // ---------------------------------------------------------------------
  const event1 = await insertOne(
    "events",
    {
      title: "Fall Leadership Assembly",
      slug: "fall-leadership-assembly-2025",
      short_description: "An all-school assembly introducing this year's council.",
      full_description: faker.lorem.paragraphs(2),
      category_id: eventCategories.student_council,
      organizer: "Student Council",
      starts_at: daysFromNow(-10),
      ends_at: daysFromNow(-10),
      location: "Main Auditorium",
      eligible_grade_level_ids: [grades.grade_10, grades.grade_11, grades.grade_12],
      registration_opens_at: daysFromNow(-20),
      registration_closes_at: daysFromNow(-11),
      capacity: 100,
      waitlist_capacity: 10,
      registration_form_version_id: formCVersion.id,
      status: "completed",
      visibility: "public",
      featured: true,
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "event 1 (completed)",
  );
  const reg1 = await insertOne(
    "event_registrations",
    {
      event_id: event1.id,
      student_id: student1.id,
      status: "attended",
      registered_at: daysFromNow(-15),
    },
    "registration (student_001)",
  );
  await insertOne(
    "event_registration_answers",
    { registration_id: reg1.id, question_id: qDietary.id, value_json: "None" },
    "registration answer",
  );
  await insertOne(
    "event_attendance",
    {
      event_id: event1.id,
      registration_id: reg1.id,
      attended: true,
      marked_by: ADMIN_ID,
      marked_at: daysFromNow(-10),
    },
    "attendance record",
  );
  await insertOne(
    "saved_events",
    { event_id: event1.id, student_id: student3.id },
    "saved event (student_003)",
  );

  const event2 = await insertOne(
    "events",
    {
      title: "Battle of the Bands",
      slug: "battle-of-the-bands-2026",
      short_description: "Student bands compete for the top spot.",
      full_description: faker.lorem.paragraphs(2),
      category_id: eventCategories.competition,
      organizer: "Student Council Arts Committee",
      starts_at: daysFromNow(20),
      ends_at: daysFromNow(20),
      location: "School Gymnasium",
      eligible_grade_level_ids: [],
      registration_opens_at: daysFromNow(-2),
      registration_closes_at: daysFromNow(15),
      capacity: 20,
      waitlist_capacity: 5,
      rules: "Each band performs a 10-minute set. No explicit lyrics. All members must be enrolled students.",
      required_materials: "Own instruments; PA system and drum kit provided.",
      competition_format: "Single elimination, judged by a panel of teachers and student council members.",
      prizes: "1st place: $200 gift card and trophy. 2nd place: $100 gift card.",
      contact_info: "studentcouncil@kingskids.mn",
      registration_form_version_id: formCVersion.id,
      status: "registration_open",
      visibility: "public",
      featured: true,
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "event 2 (competition, upcoming)",
  );
  await insertOne(
    "event_registrations",
    {
      event_id: event2.id,
      student_id: student3.id,
      status: "registered",
      registered_at: daysFromNow(-1),
    },
    "registration (student_003)",
  );

  // ---------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------
  const suggestion = await insertOne(
    "suggestions",
    {
      category_id: suggestionCategories.cafeteria,
      subject: "More vegetarian options in the cafeteria",
      message: faker.lorem.paragraph(),
      proposed_solution: "Add at least two vegetarian entrees to the weekly rotation.",
      identity_mode: "identified",
      student_id: student3.id,
      status: "reviewing",
      assigned_to: ADMIN_ID,
    },
    "suggestion (student_003)",
  );
  await insertOne(
    "suggestion_replies",
    {
      suggestion_id: suggestion.id,
      author_type: "admin",
      author_id: ADMIN_ID,
      message: "Thanks for the suggestion! We're looking into adding more vegetarian options next semester.",
    },
    "suggestion reply",
  );

  // ---------------------------------------------------------------------
  // Announcements
  // ---------------------------------------------------------------------
  const announcement = await insertOne(
    "announcements",
    {
      title: "Welcome Back — Student Council Kickoff",
      slug: "welcome-back-council-kickoff-2025",
      summary: "Join us for the first council meeting of the year!",
      content: faker.lorem.paragraphs(3),
      audience: "all_students",
      publish_at: daysFromNow(-2),
      pinned: true,
      urgent: false,
      status: "published",
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "announcement",
  );
  await insertOne(
    "announcement_reads",
    { announcement_id: announcement.id, student_id: student1.id },
    "announcement read (student_001)",
  );

  // ---------------------------------------------------------------------
  // FAQ
  // ---------------------------------------------------------------------
  const faq = await insertOne(
    "faqs",
    {
      category_id: faqCategories.applications,
      question: "How do I apply for a student council position?",
      answer: "Open the Applications tab during an active campaign window, choose a position, and submit the form before the closing date.",
      status: "published",
      created_by: ADMIN_ID,
      updated_by: ADMIN_ID,
    },
    "faq",
  );
  await insertOne(
    "faq_feedback",
    { faq_id: faq.id, student_id: student3.id, is_helpful: true },
    "faq feedback (student_003)",
  );

  // ---------------------------------------------------------------------
  // Notifications — direct insert, no email/push dispatch
  // ---------------------------------------------------------------------
  await insertOne(
    "notifications",
    {
      user_id: ADMIN_ID,
      type: "application_submitted",
      title: "New application submitted",
      message: `${student1.display_name} submitted an application for Grade Representative.`,
      link: "/admin/applications",
      delivery_status: "sent",
      related_entity_type: "application_submission",
      related_entity_id: submission.id,
    },
    "notification for admin",
  );

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message ?? err);
  process.exit(1);
});
