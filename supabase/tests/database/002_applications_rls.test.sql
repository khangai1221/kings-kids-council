-- pgTAP tests for application RLS isolation and the single-application guard.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.profiles (id, clerk_user_id, school_email, display_name, role, onboarding_status)
values
  ('44444444-4444-4444-4444-444444444444', 'test_applicant_a', 'applicant.a@kingskids.mn', 'Applicant A', 'student', 'completed'),
  ('55555555-5555-5555-5555-555555555555', 'test_applicant_b', 'applicant.b@kingskids.mn', 'Applicant B', 'student', 'completed');

insert into public.forms (id, kind, title, slug, status)
values ('66666666-6666-6666-6666-666666666666', 'application', 'Test Form', 'test-form-rls', 'published');
insert into public.form_versions (id, form_id, version_number, status, published_at)
values ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', 1, 'published', now());

insert into public.application_campaigns (id, title, slug, status)
values ('88888888-8888-8888-8888-888888888888', 'Test Campaign', 'test-campaign-rls', 'open');
insert into public.application_positions (id, campaign_id, title)
values ('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', 'Test Position');

-- Applicant A creates a submission.
select set_config('request.jwt.claims', json_build_object('sub', 'test_applicant_a')::text, true);
set local role authenticated;

insert into public.application_submissions (id, campaign_id, position_id, student_id, form_version_id, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'draft');

select ok(
  exists(select 1 from public.application_submissions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'applicant A can see their own draft submission'
);

select throws_ok(
  $$ insert into public.application_submissions (campaign_id, position_id, student_id, form_version_id, status)
     values ('88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'draft') $$,
  'unique_violation',
  'a second active application for the same position is rejected by the database trigger'
);

reset role;
-- Applicant B should not be able to see applicant A's submission at all.
select set_config('request.jwt.claims', json_build_object('sub', 'test_applicant_b')::text, true);
set local role authenticated;

select is(
  (select count(*) from public.application_submissions where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::int,
  0,
  'applicant B cannot see applicant A''s submission (RLS isolation)'
);

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'test_applicant_a')::text, true);
set local role authenticated;

select lives_ok(
  $$ update public.application_submissions set status = 'submitted' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'applicant A may transition their own submission from draft to submitted'
);

select * from finish();
rollback;
