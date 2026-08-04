-- pgTAP tests for the permission helper functions.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Fixtures: a student and an admin profile.
insert into public.profiles (id, clerk_user_id, school_email, display_name, role, onboarding_status)
values
  ('11111111-1111-1111-1111-111111111111', 'test_student', 'test.student@kingskids.mn', 'Test Student', 'student', 'completed'),
  ('22222222-2222-2222-2222-222222222222', 'test_admin', 'test.admin@kingskids.mn', 'Test Admin', 'admin', 'completed'),
  ('33333333-3333-3333-3333-333333333333', 'test_super', 'test.super@kingskids.mn', 'Test Super Admin', 'super_admin', 'completed');

-- Simulate the student's request context.
select set_config('request.jwt.claims', json_build_object('sub', 'test_student')::text, true);
set local role authenticated;

select is(public.current_profile_id(), '11111111-1111-1111-1111-111111111111'::uuid, 'current_profile_id resolves the student');
select ok(not public.has_capability('applications.manage'), 'student lacks applications.manage by default');
select ok(not public.is_admin_tier(), 'student is not admin-tier');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'test_admin')::text, true);
set local role authenticated;

select ok(public.has_capability('applications.manage'), 'admin has applications.manage via default role_permissions');
select ok(not public.has_capability('settings.manage'), 'admin does NOT have settings.manage (super_admin only)');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', 'test_super')::text, true);
set local role authenticated;

select ok(public.has_capability('settings.manage'), 'super_admin has every capability implicitly');

select * from finish();
rollback;
