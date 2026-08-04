-- pgTAP tests for anonymous-to-council suggestion identity protection.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.profiles (id, clerk_user_id, school_email, display_name, role, onboarding_status)
values
  ('a1111111-1111-1111-1111-111111111111', 'test_sugg_student', 'sugg.student@kingskids.mn', 'Sugg Student', 'student', 'completed'),
  ('a2222222-2222-2222-2222-222222222222', 'test_sugg_admin', 'sugg.admin@kingskids.mn', 'Sugg Admin', 'admin', 'completed'),
  ('a3333333-3333-3333-3333-333333333333', 'test_sugg_advisor', 'sugg.advisor@kingskids.mn', 'Sugg Advisor', 'teacher_advisor', 'completed');

select set_config('request.jwt.claims', json_build_object('sub', 'test_sugg_student')::text, true);
set local role authenticated;

select lives_ok(
  $$ select public.submit_suggestion(null, 'Test subject', 'Test message', null, null, 'anonymous_to_council') $$,
  'a student can submit an anonymous-to-council suggestion'
);

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'test_sugg_admin')::text, true);
set local role authenticated;

select is(
  (select count(*) from public.suggestion_identity_mappings)::int,
  0,
  'an ordinary admin (suggestions.manage only) sees zero rows in the identity mapping table directly'
);

select throws_ok(
  $$ select public.reveal_suggestion_identity(
       (select id from public.suggestions where subject = 'Test subject'),
       'test attempt'
     ) $$,
  '42501',
  'an ordinary admin without suggestions.manage_restricted cannot call reveal_suggestion_identity'
);

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'test_sugg_advisor')::text, true);
set local role authenticated;

select lives_ok(
  $$ select public.reveal_suggestion_identity(
       (select id from public.suggestions where subject = 'Test subject'),
       'test attempt with authorization'
     ) $$,
  'a teacher advisor (suggestions.manage_restricted) can reveal the identity'
);

select ok(
  exists(select 1 from public.audit_logs where action = 'suggestion_identity_access' and reason = 'test attempt with authorization'),
  'the reveal call was written to the audit log'
);

select * from finish();
rollback;
