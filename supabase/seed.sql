-- =============================================================================
-- YM Student Council Portal — local/staging demo seed data
--
-- Runs automatically after `supabase db reset` (and via `pnpm db:seed`, which
-- just invokes the same file through the CLI). Everything below is FICTIONAL
-- — no real student personal information.
--
-- Connecting real Clerk test accounts to these seeded profiles:
--   1. Sign up in your Clerk dev instance with an @kingskids.mn email (or
--      whatever ALLOWED_EMAIL_DOMAIN you configured) — e.g. superadmin@kingskids.mn.
--   2. The Clerk webhook fires `user.created` and lib/webhooks/clerk.ts
--      creates a *new* profile row using the real clerk_user_id.
--   3. Run this SQL to promote that new row instead of using the fake seed
--      row (swap in your real school_email):
--
--        update public.profiles
--        set role = 'super_admin', onboarding_status = 'completed'
--        where school_email = 'superadmin@kingskids.mn';
--
--   Alternatively, for pure local testing without Clerk at all, you can
--   temporarily hardcode `current_clerk_user_id()` — see
--   supabase/tests/README.md for the SQL test harness that does this.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- School classes (grade_levels already exist from migrations)
-- ---------------------------------------------------------------------------
insert into public.school_classes (id, grade_level_id, key, label, sort_order)
select '00000000-0000-0000-0018-000000000001'::uuid, id, 'grade9_a', 'Grade 9A', 1 from public.grade_levels where key = 'grade_9'
union all
select '00000000-0000-0000-0018-000000000002'::uuid, id, 'grade9_b', 'Grade 9B', 2 from public.grade_levels where key = 'grade_9'
union all
select '00000000-0000-0000-0018-000000000003'::uuid, id, 'grade10_a', 'Grade 10A', 3 from public.grade_levels where key = 'grade_10'
union all
select '00000000-0000-0000-0018-000000000004'::uuid, id, 'grade10_b', 'Grade 10B', 4 from public.grade_levels where key = 'grade_10'
union all
select '00000000-0000-0000-0018-000000000005'::uuid, id, 'grade11_a', 'Grade 11A', 5 from public.grade_levels where key = 'grade_11'
union all
select '00000000-0000-0000-0018-000000000006'::uuid, id, 'grade12_a', 'Grade 12A', 6 from public.grade_levels where key = 'grade_12';

-- ---------------------------------------------------------------------------
-- Profiles — staff
-- ---------------------------------------------------------------------------
insert into public.profiles (id, clerk_user_id, school_email, first_name, last_name, display_name, role, account_status, onboarding_status, grade_level_id, school_class_id, accepted_rules_at, accepted_privacy_at)
values
  ('00000000-0000-0000-0001-000000000001', 'user_seed_superadmin', 'bilguun.s@kingskids.mn', 'Bilguun', 'Sukhbaatar', 'Bilguun S.', 'super_admin', 'active', 'completed', null, null, now(), now()),
  ('00000000-0000-0000-0001-000000000002', 'user_seed_teacheradvisor', 'sarangerel.b@kingskids.mn', 'Sarangerel', 'Batbayar', 'Ms. Batbayar', 'teacher_advisor', 'active', 'completed', null, null, now(), now()),
  ('00000000-0000-0000-0001-000000000003', 'user_seed_admin', 'munkhjin.e@kingskids.mn', 'Munkhjin', 'Erdenebat', 'Munkhjin E.', 'admin', 'active', 'completed', null, null, now(), now()),
  ('00000000-0000-0000-0001-000000000004', 'user_seed_reviewer1', 'naranbaatar.t@kingskids.mn', 'Naranbaatar', 'Tuvshin', 'Naranbaatar T.', 'reviewer', 'active', 'completed', null, null, now(), now()),
  ('00000000-0000-0000-0001-000000000005', 'user_seed_reviewer2', 'undrakh.b@kingskids.mn', 'Undrakh', 'Bold', 'Undrakh B.', 'reviewer', 'active', 'completed', null, null, now(), now());

-- ---------------------------------------------------------------------------
-- Profiles — students (grades vary; two are council_member)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, clerk_user_id, school_email, first_name, last_name, display_name, role, account_status, onboarding_status, grade_level_id, school_class_id, graduation_year, accepted_rules_at, accepted_privacy_at)
select '00000000-0000-0000-0001-000000000010'::uuid, 'user_seed_student1', 'anujin.g@kingskids.mn', 'Anujin', 'Ganbold', 'Anujin G.', 'council_member'::app_role, 'active'::account_status, 'completed'::onboarding_status, gl.id, sc.id, 2027, now(), now()
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_11' and sc.key = 'grade11_a'
union all
select '00000000-0000-0000-0001-000000000011'::uuid, 'user_seed_student2', 'temuulen.o@kingskids.mn', 'Temuulen', 'Oyunbileg', 'Temuulen O.', 'council_member'::app_role, 'active'::account_status, 'completed'::onboarding_status, gl.id, sc.id, 2027, now(), now()
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_11' and sc.key = 'grade11_a'
union all
select '00000000-0000-0000-0001-000000000012'::uuid, 'user_seed_student3', 'nomin.d@kingskids.mn', 'Nomin', 'Dorjsuren', 'Nomin D.', 'student'::app_role, 'active'::account_status, 'completed'::onboarding_status, gl.id, sc.id, 2028, now(), now()
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_10' and sc.key = 'grade10_a'
union all
select '00000000-0000-0000-0001-000000000013'::uuid, 'user_seed_student4', 'gerelmaa.a@kingskids.mn', 'Gerelmaa', 'Altangerel', 'Gerelmaa A.', 'student'::app_role, 'active'::account_status, 'completed'::onboarding_status, gl.id, sc.id, 2028, now(), now()
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_10' and sc.key = 'grade10_b'
union all
select '00000000-0000-0000-0001-000000000014'::uuid, 'user_seed_student5', 'ariunbold.n@kingskids.mn', 'Ariunbold', 'Namsrai', 'Ariunbold N.', 'student'::app_role, 'active'::account_status, 'completed'::onboarding_status, gl.id, sc.id, 2029, now(), now()
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_9' and sc.key = 'grade9_a'
union all
select '00000000-0000-0000-0001-000000000015'::uuid, 'user_seed_student6', 'sarnai.k@kingskids.mn', 'Sarnai', 'Khulan', 'Sarnai K.', 'student'::app_role, 'active'::account_status, 'completed'::onboarding_status, gl.id, sc.id, 2029, now(), now()
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_9' and sc.key = 'grade9_b'
union all
select '00000000-0000-0000-0001-000000000016'::uuid, 'user_seed_student7', 'batzorig.m@kingskids.mn', 'Batzorig', 'Myagmar', 'Batzorig M.', 'student'::app_role, 'active'::account_status, 'completed'::onboarding_status, gl.id, sc.id, 2026, now(), now()
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_12' and sc.key = 'grade12_a'
union all
select '00000000-0000-0000-0001-000000000017'::uuid, 'user_seed_student8', 'enkhjin.p@kingskids.mn', 'Enkhjin', 'Purevsuren', 'Enkhjin P.', 'student'::app_role, 'active'::account_status, 'completed'::onboarding_status, gl.id, sc.id, 2028, now(), now()
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_10' and sc.key = 'grade10_a'
union all
select '00000000-0000-0000-0001-000000000018'::uuid, 'user_seed_student9', 'khulan.t@kingskids.mn', 'Khulan', 'Tsogtbaatar', 'Khulan T.', 'student'::app_role, 'active'::account_status, 'pending'::onboarding_status, gl.id, sc.id, 2027, null, null
from public.grade_levels gl, public.school_classes sc where gl.key = 'grade_11' and sc.key = 'grade11_a';

-- One student holds a supplementary reviewer role in addition to council_member.
insert into public.user_roles (user_id, role_key, granted_by)
values ('00000000-0000-0000-0001-000000000010', 'reviewer', '00000000-0000-0000-0001-000000000002');

-- ---------------------------------------------------------------------------
-- Council
-- ---------------------------------------------------------------------------
insert into public.council_terms (id, title, academic_year, start_date, end_date, is_current)
values ('00000000-0000-0000-0002-000000000001', '2025-2026 Term', '2025-2026', '2025-09-01', '2026-06-15', true);

insert into public.council_positions (id, term_id, title, description, responsibilities, sort_order)
values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001', 'President', 'Leads the student council and represents the student body.', 'Chairs meetings, liaises with school administration, sets the council agenda.', 1),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000001', 'Vice President', 'Supports the President and oversees committees.', 'Deputizes for the President, coordinates committee leads.', 2),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000001', 'Secretary', 'Maintains council records.', 'Takes meeting minutes, manages council communications.', 3),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0002-000000000001', 'Event Coordinator', 'Plans and runs student events.', 'Organizes logistics for council-run events and competitions.', 4),
  ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0002-000000000001', 'Class Representative', 'Represents an individual grade.', 'Gathers feedback from and reports back to their grade.', 5);

insert into public.council_members (id, term_id, position_id, profile_id, display_name, grade_level_label, short_bio, responsibilities, term_start, term_end, sort_order, status, created_by)
values
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0001-000000000010', 'Anujin G.', 'Grade 11', 'Anujin is passionate about student wellbeing and academic support programs.', 'Chairs council meetings and represents the council to school leadership.', '2025-09-01', '2026-06-15', 1, 'published', '00000000-0000-0000-0001-000000000002'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0001-000000000011', 'Temuulen O.', 'Grade 11', 'Temuulen previously led the Debate Club and enjoys organizing events.', 'Coordinates committees and supports the President.', '2025-09-01', '2026-06-15', 2, 'published', '00000000-0000-0000-0001-000000000002');

-- ---------------------------------------------------------------------------
-- Reusable form: council application form (published, version 1)
-- ---------------------------------------------------------------------------
insert into public.forms (id, kind, title, slug, description, status, created_by)
values ('00000000-0000-0000-0005-000000000001', 'application', 'Student Council Application 2026', 'council-application-2026', 'Application form for the 2026-2027 student council.', 'published', '00000000-0000-0000-0001-000000000003');

-- Questions must be inserted while the version is still 'draft' — the
-- trg_form_questions_immutable trigger blocks editing a published version's
-- questions. Flip each version to 'published' only after its questions exist.
insert into public.form_versions (id, form_id, version_number, status, created_by)
values ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0005-000000000001', 1, 'draft', '00000000-0000-0000-0001-000000000003');

insert into public.form_questions (id, form_version_id, key, type, label, description, is_required, position, max_length)
values
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0006-000000000001', 'motivation', 'long_text', 'Why do you want to join the student council?', 'Tell us what motivates you to run.', true, 1, 1500),
  ('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0006-000000000001', 'experience', 'long_text', 'Describe any relevant leadership experience.', null, false, 2, 1500),
  ('00000000-0000-0000-0007-000000000003', '00000000-0000-0000-0006-000000000001', 'availability', 'yes_no', 'Can you attend weekly Thursday council meetings?', null, true, 3, null),
  ('00000000-0000-0000-0007-000000000004', '00000000-0000-0000-0006-000000000001', 'resume', 'file_upload', 'Optional supporting document', 'PDF or Word document, max 10MB.', false, 4, null);

update public.form_questions set allowed_file_types = array['pdf','doc','docx'], max_file_size_bytes = 10485760
where id = '00000000-0000-0000-0007-000000000004';

update public.form_versions set status = 'published', published_at = now()
where id = '00000000-0000-0000-0006-000000000001';

-- Reusable form: cafeteria survey (published, version 1)
insert into public.forms (id, kind, title, slug, description, status, created_by)
values ('00000000-0000-0000-0005-000000000002', 'survey', 'Cafeteria Satisfaction Survey', 'cafeteria-satisfaction-2026', 'Help us improve the school cafeteria menu and service.', 'published', '00000000-0000-0000-0001-000000000003');

insert into public.form_versions (id, form_id, version_number, status, created_by)
values ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0005-000000000002', 1, 'draft', '00000000-0000-0000-0001-000000000003');

insert into public.form_questions (id, form_version_id, key, type, label, is_required, position, rating_scale)
values
  ('00000000-0000-0000-0007-000000000010', '00000000-0000-0000-0006-000000000002', 'overall_rating', 'rating', 'How satisfied are you with the cafeteria overall?', true, 1, 5),
  ('00000000-0000-0000-0007-000000000011', '00000000-0000-0000-0006-000000000002', 'favorite_meal', 'short_text', 'What is your favorite cafeteria meal?', false, 2, null),
  ('00000000-0000-0000-0007-000000000012', '00000000-0000-0000-0006-000000000002', 'improvements', 'long_text', 'What should we improve?', false, 3, null);

update public.form_versions set status = 'published', published_at = now()
where id = '00000000-0000-0000-0006-000000000002';

-- Reusable form: debate competition registration (published, version 1)
insert into public.forms (id, kind, title, slug, description, status, created_by)
values ('00000000-0000-0000-0005-000000000003', 'event_registration', 'Debate Competition Registration', 'debate-competition-registration', 'Registration questions for the fall debate competition.', 'published', '00000000-0000-0000-0001-000000000003');

insert into public.form_versions (id, form_id, version_number, status, created_by)
values ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0005-000000000003', 1, 'draft', '00000000-0000-0000-0001-000000000003');

insert into public.form_questions (id, form_version_id, key, type, label, is_required, position, choice_allow_other)
values ('00000000-0000-0000-0007-000000000020', '00000000-0000-0000-0006-000000000003', 'preferred_format', 'single_choice', 'Preferred debate format', true, 1, false);

insert into public.form_question_options (question_id, value, label, position) values
  ('00000000-0000-0000-0007-000000000020', 'policy', 'Policy debate', 1),
  ('00000000-0000-0000-0007-000000000020', 'lincoln_douglas', 'Lincoln-Douglas', 2),
  ('00000000-0000-0000-0007-000000000020', 'public_forum', 'Public Forum', 3);

update public.form_versions set status = 'published', published_at = now()
where id = '00000000-0000-0000-0006-000000000003';

-- ---------------------------------------------------------------------------
-- Application campaign + positions + a demo submission with review
-- ---------------------------------------------------------------------------
insert into public.review_rubrics (id, title, description, created_by)
values ('00000000-0000-0000-000c-000000000001', 'Council Application Rubric', 'Standard scoring rubric for council applications.', '00000000-0000-0000-0001-000000000002');

insert into public.review_rubric_items (id, rubric_id, label, description, weight, min_score, max_score, position)
values
  ('00000000-0000-0000-000d-000000000001', '00000000-0000-0000-000c-000000000001', 'Motivation', 'Clarity and sincerity of motivation.', 1, 0, 5, 1),
  ('00000000-0000-0000-000d-000000000002', '00000000-0000-0000-000c-000000000001', 'Leadership potential', 'Evidence of leadership or initiative.', 1.5, 0, 5, 2),
  ('00000000-0000-0000-000d-000000000003', '00000000-0000-0000-000c-000000000001', 'Communication', 'Clarity of written communication.', 1, 0, 5, 3);

insert into public.application_campaigns (id, title, slug, description, academic_year, opening_at, closing_at, eligible_grade_level_ids, form_version_id, review_rubric_id, status, confirmation_message, contact_email, created_by)
select
  '00000000-0000-0000-0009-000000000001', '2026 Student Council Elections', '2026-student-council-elections',
  'Apply for a position on the 2026-2027 student council.', '2025-2026',
  now() - interval '10 days', now() + interval '20 days',
  array(select id from public.grade_levels where key in ('grade_9','grade_10','grade_11')),
  '00000000-0000-0000-0006-000000000001', '00000000-0000-0000-000c-000000000001', 'open',
  'Thank you for applying! You will hear back after the review period closes.', 'council@kingskids.mn',
  '00000000-0000-0000-0001-000000000003';

insert into public.application_positions (id, campaign_id, title, description, responsibilities, max_seats, requires_interview, sort_order)
values
  ('00000000-0000-0000-000a-000000000001', '00000000-0000-0000-0009-000000000001', 'President', 'Council President', 'See council position description.', 1, true, 1),
  ('00000000-0000-0000-000a-000000000002', '00000000-0000-0000-0009-000000000001', 'Secretary', 'Council Secretary', 'See council position description.', 1, false, 2);

-- Nomin's submission: under_review, with one completed review.
insert into public.application_submissions (id, campaign_id, position_id, student_id, form_version_id, status, progress_percent, submitted_at)
values ('00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0009-000000000001', '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-0001-000000000012', '00000000-0000-0000-0006-000000000001', 'under_review', 100, now() - interval '5 days');

insert into public.application_answers (submission_id, question_id, value_json) values
  ('00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0007-000000000001', '"I want to help organize better communication between students and staff."'),
  ('00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0007-000000000002', '"Secretary of the Debate Club for one year."'),
  ('00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0007-000000000003', 'true');

insert into public.review_assignments (id, submission_id, reviewer_id, assigned_by, status)
values ('00000000-0000-0000-000e-000000000001', '00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0001-000000000002', 'completed');

insert into public.application_reviews (id, assignment_id, submission_id, reviewer_id, recommendation, private_comments, status, submitted_at)
values ('00000000-0000-0000-000f-000000000001', '00000000-0000-0000-000e-000000000001', '00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0001-000000000004', 'accept', 'Strong written communication and clear motivation.', 'submitted', now() - interval '2 days');

insert into public.application_review_scores (review_id, rubric_item_id, score) values
  ('00000000-0000-0000-000f-000000000001', '00000000-0000-0000-000d-000000000001', 4),
  ('00000000-0000-0000-000f-000000000001', '00000000-0000-0000-000d-000000000002', 4),
  ('00000000-0000-0000-000f-000000000001', '00000000-0000-0000-000d-000000000003', 5);

-- Gerelmaa's submission: still a draft (in progress).
insert into public.application_submissions (id, campaign_id, position_id, student_id, form_version_id, status, progress_percent)
values ('00000000-0000-0000-000b-000000000002', '00000000-0000-0000-0009-000000000001', '00000000-0000-0000-000a-000000000001', '00000000-0000-0000-0001-000000000013', '00000000-0000-0000-0006-000000000001', 'draft', 25);

insert into public.application_answers (submission_id, question_id, value_json) values
  ('00000000-0000-0000-000b-000000000002', '00000000-0000-0000-0007-000000000001', '"Draft answer in progress..."');

-- ---------------------------------------------------------------------------
-- Election — kept in draft status per spec ("one draft election")
-- ---------------------------------------------------------------------------
insert into public.elections (id, title, slug, description, election_type, eligible_grade_level_ids, opens_at, closes_at, status, instructions, created_by)
select
  '00000000-0000-0000-0010-000000000001', '2026 Student Council Election', '2026-student-council-election',
  'Vote for your 2026-2027 student council representatives.', 'general',
  array(select id from public.grade_levels where key in ('grade_9','grade_10','grade_11','grade_12')),
  now() + interval '14 days', now() + interval '17 days', 'draft',
  'You may select one candidate per position. Voting is anonymous.',
  '00000000-0000-0000-0001-000000000002';

insert into public.election_positions (id, election_id, title, max_choices, sort_order)
values ('00000000-0000-0000-0011-000000000001', '00000000-0000-0000-0010-000000000001', 'President', 1, 1);

insert into public.election_candidates (id, election_position_id, student_id, candidate_name, grade_level_label, statement, approval_status, sort_order)
values
  ('00000000-0000-0000-0012-000000000001', '00000000-0000-0000-0011-000000000001', '00000000-0000-0000-0001-000000000016', 'Batzorig M.', 'Grade 12', 'I will push for more student input on school policy.', 'approved', 1),
  ('00000000-0000-0000-0012-000000000002', '00000000-0000-0000-0011-000000000001', '00000000-0000-0000-0001-000000000017', 'Enkhjin P.', 'Grade 10', 'I want to expand club funding and weekend events.', 'approved', 2);

-- ---------------------------------------------------------------------------
-- Poll — open, with three options (demo votes omitted; cast_poll_vote is
-- the only write path and requires a real authenticated session)
-- ---------------------------------------------------------------------------
insert into public.polls (id, title, slug, description, status, opens_at, closes_at, created_by)
values (
  '00000000-0000-0000-001a-000000000001', 'New Canteen Menu', 'new-canteen-menu',
  'Which new menu option should the canteen add next month?', 'open',
  now() - interval '2 days', now() + interval '12 days',
  '00000000-0000-0000-0001-000000000003'
);

insert into public.poll_options (id, poll_id, label, sort_order) values
  ('00000000-0000-0000-001b-000000000001', '00000000-0000-0000-001a-000000000001', 'Grilled chicken wrap', 1),
  ('00000000-0000-0000-001b-000000000002', '00000000-0000-0000-001a-000000000001', 'Veggie stir-fry bowl', 2),
  ('00000000-0000-0000-001b-000000000003', '00000000-0000-0000-001a-000000000001', 'Beef noodle soup', 3);

-- ---------------------------------------------------------------------------
-- Survey — open
-- ---------------------------------------------------------------------------
insert into public.surveys (id, title, slug, description, mode, form_version_id, eligible_grade_level_ids, opens_at, closes_at, show_results_after_submission, status, created_by)
values (
  '00000000-0000-0000-0013-000000000001', 'Cafeteria Satisfaction Survey', 'cafeteria-satisfaction-2026',
  'Help us improve the school cafeteria menu and service.', 'anonymous_with_participation_tracking',
  '00000000-0000-0000-0006-000000000002', '{}', now() - interval '2 days', now() + interval '12 days', true, 'open',
  '00000000-0000-0000-0001-000000000003'
);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
insert into public.events (id, title, slug, short_description, full_description, category_id, organizer, starts_at, ends_at, location, registration_opens_at, registration_closes_at, capacity, waitlist_capacity, registration_form_version_id, status, visibility, featured, created_by)
select
  '00000000-0000-0000-0014-000000000001', 'Fall Debate Competition', 'fall-debate-competition',
  'Inter-grade debate competition.', 'Teams of two compete across three debate formats. Open to grades 9-12.',
  ec.id, 'Student Council', now() + interval '18 days', now() + interval '18 days' + interval '4 hours',
  'Main Auditorium', now() - interval '1 day', now() + interval '10 days', 32, 8,
  '00000000-0000-0000-0006-000000000003', 'registration_open', 'public', true, '00000000-0000-0000-0001-000000000003'
from public.event_categories ec where ec.key = 'competition';

insert into public.events (id, title, slug, short_description, full_description, category_id, organizer, starts_at, ends_at, location, status, visibility, featured, created_by)
select
  '00000000-0000-0000-0014-000000000002', 'Community Service Day', 'community-service-day',
  'A school-wide day of community service projects.', 'Students volunteer at partner organizations around the city.',
  ec.id, 'Student Council', now() + interval '30 days', now() + interval '30 days' + interval '6 hours',
  'Various off-campus sites', 'published', 'public', false, '00000000-0000-0000-0001-000000000003'
from public.event_categories ec where ec.key = 'community_service';

insert into public.events (id, title, slug, short_description, full_description, category_id, organizer, starts_at, ends_at, location, status, visibility, featured, created_by)
select
  '00000000-0000-0000-0014-000000000003', 'Winter Break', 'winter-break',
  'School closed for winter break.', 'No classes or council activities during this period.',
  ec.id, 'School Administration', now() + interval '60 days', now() + interval '74 days',
  'N/A', 'published', 'public', false, '00000000-0000-0000-0001-000000000003'
from public.event_categories ec where ec.key = 'school_holiday';

insert into public.event_registrations (id, event_id, student_id, status)
values ('00000000-0000-0000-0019-000000000001', '00000000-0000-0000-0014-000000000001', '00000000-0000-0000-0001-000000000014', 'registered');

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
insert into public.announcements (id, title, slug, summary, content, audience, publish_at, pinned, urgent, status, created_by)
values
  ('00000000-0000-0000-0015-000000000001', 'Welcome back to the 2025-2026 school year!', 'welcome-back-2025-2026', 'A message from the student council.', 'We are excited to kick off another year of council elections, events, and student initiatives. Check the Applications page to run for a position!', 'all_students', now() - interval '20 days', true, false, 'published', '00000000-0000-0000-0001-000000000002'),
  ('00000000-0000-0000-0015-000000000002', 'Scheduled maintenance tonight', 'scheduled-maintenance-tonight', 'The portal will be briefly unavailable.', 'The portal will be offline for scheduled maintenance between 11pm and midnight tonight.', 'all_students', now() - interval '1 day', false, true, 'published', '00000000-0000-0000-0001-000000000003'),
  ('00000000-0000-0000-0015-000000000003', 'Club Fair sign-ups open', 'club-fair-signups-open', 'Sign up your club for the fall Club Fair.', 'Club leaders can now reserve a table for the fall Club Fair. Contact the Event Coordinator to sign up.', 'all_students', now() - interval '3 days', false, false, 'published', '00000000-0000-0000-0001-000000000003');

-- ---------------------------------------------------------------------------
-- FAQ
-- ---------------------------------------------------------------------------
insert into public.faqs (category_id, question, answer, sort_order, status, created_by)
select fc.id, 'How do I apply for a student council position?', 'Go to Applications, choose an open campaign, select a position, and complete the form. You can save your progress and submit before the closing date.', 1, 'published'::faq_status, '00000000-0000-0000-0001-000000000003'::uuid
from public.faq_categories fc where fc.key = 'applications'
union all
select fc.id, 'How does voting work?', 'When an election is open, go to Voting, review the candidates, and submit your ballot. You can vote once per position and your choices are kept anonymous.', 1, 'published'::faq_status, '00000000-0000-0000-0001-000000000003'::uuid
from public.faq_categories fc where fc.key = 'elections'
union all
select fc.id, 'Can I submit a suggestion anonymously?', 'Yes. When submitting a suggestion you can choose "Anonymous to council" so ordinary council members cannot see your identity. Only a teacher advisor or Super Admin can access it, and only when policy requires it.', 1, 'published'::faq_status, '00000000-0000-0000-0001-000000000003'::uuid
from public.faq_categories fc where fc.key = 'suggestions'
union all
select fc.id, 'Why can I only sign in with a school email?', 'The portal is restricted to verified @kingskids.mn accounts to keep student data private to the school community.', 1, 'published'::faq_status, '00000000-0000-0000-0001-000000000003'::uuid
from public.faq_categories fc where fc.key = 'account_and_login';

-- ---------------------------------------------------------------------------
-- Suggestions (one identified, one anonymous-to-council with a reply)
-- ---------------------------------------------------------------------------
insert into public.suggestions (id, category_id, subject, message, identity_mode, student_id, status, created_at)
select '00000000-0000-0000-0017-000000000001', sc.id, 'More vegetarian options', 'Could the cafeteria add more vegetarian meal options during the week?', 'identified', '00000000-0000-0000-0001-000000000015', 'planned', now() - interval '9 days'
from public.suggestion_categories sc where sc.key = 'cafeteria';

insert into public.suggestion_replies (suggestion_id, author_type, author_id, message)
values ('00000000-0000-0000-0017-000000000001', 'admin', '00000000-0000-0000-0001-000000000003', 'Thanks for the suggestion! We are working with the cafeteria staff to add two vegetarian options starting next month.');

insert into public.suggestions (id, category_id, subject, message, identity_mode, status, created_at)
select '00000000-0000-0000-0017-000000000002', sc.id, 'Quiet study space needed', 'It would help to have a designated quiet space in the library during exam weeks.', 'anonymous_to_council', 'received', now() - interval '2 days'
from public.suggestion_categories sc where sc.key = 'academic_environment';

insert into public.suggestion_identity_mappings (suggestion_id, student_id)
values ('00000000-0000-0000-0017-000000000002', '00000000-0000-0000-0001-000000000018');

comment on schema public is 'YM Student Council Portal — seeded with fictional demo data. See supabase/seed.sql for how to connect real Clerk accounts.';
