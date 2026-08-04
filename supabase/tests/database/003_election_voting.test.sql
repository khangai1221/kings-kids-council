-- pgTAP tests for cast_election_vote: eligibility, one-shot ballots, and
-- database-level duplicate-vote prevention.
-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.grade_levels (id, key, label, sort_order)
values ('b0000000-0000-0000-0000-000000000001', 'test_grade_11', 'Test Grade 11', 100)
on conflict (key) do nothing;

insert into public.profiles (id, clerk_user_id, school_email, display_name, role, grade_level_id, onboarding_status)
values ('c0000000-0000-0000-0000-000000000001', 'test_voter', 'voter@kingskids.mn', 'Test Voter', 'student',
        (select id from public.grade_levels where key = 'test_grade_11'), 'completed');

insert into public.elections (id, title, slug, eligible_grade_level_ids, opens_at, closes_at, status)
values (
  'd0000000-0000-0000-0000-000000000001', 'Test Election', 'test-election-voting',
  array(select id from public.grade_levels where key = 'test_grade_11'),
  now() - interval '1 hour', now() + interval '1 hour', 'open'
);

insert into public.election_positions (id, election_id, title, max_choices)
values ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Test Position', 1);

insert into public.election_candidates (id, election_position_id, candidate_name, approval_status)
values ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Candidate One', 'approved');

select set_config('request.jwt.claims', json_build_object('sub', 'test_voter')::text, true);
set local role authenticated;

select lives_ok(
  $$ select public.cast_election_vote(
       'd0000000-0000-0000-0000-000000000001',
       jsonb_build_array(jsonb_build_object('position_id', 'e0000000-0000-0000-0000-000000000001', 'candidate_ids', jsonb_build_array('f0000000-0000-0000-0000-000000000001')))
     ) $$,
  'an eligible student can cast a valid first vote'
);

select is(
  (select count(*) from public.election_participation where election_position_id = 'e0000000-0000-0000-0000-000000000001')::int,
  1,
  'exactly one participation row was recorded'
);

select is(
  (select count(*) from public.election_ballot_choices ebc join public.election_ballots eb on eb.id = ebc.ballot_id
   where eb.election_position_id = 'e0000000-0000-0000-0000-000000000001')::int,
  1,
  'exactly one ballot choice was recorded'
);

select throws_ok(
  $$ select public.cast_election_vote(
       'd0000000-0000-0000-0000-000000000001',
       jsonb_build_array(jsonb_build_object('position_id', 'e0000000-0000-0000-0000-000000000001', 'candidate_ids', jsonb_build_array('f0000000-0000-0000-0000-000000000001')))
     ) $$,
  'unique_violation',
  'voting a second time for the same position is rejected'
);

select is(
  (select count(*) from public.election_participation where election_position_id = 'e0000000-0000-0000-0000-000000000001')::int,
  1,
  'the duplicate attempt did not create a second participation row'
);

select * from finish();
rollback;
