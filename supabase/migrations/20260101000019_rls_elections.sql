-- =============================================================================
-- 0019: RLS — elections (ballots stay locked with zero client-facing policies)
-- =============================================================================

alter table public.elections enable row level security;
alter table public.election_positions enable row level security;
alter table public.election_candidates enable row level security;
alter table public.election_eligibility enable row level security;
alter table public.election_participation enable row level security;
alter table public.election_ballots enable row level security;
alter table public.election_ballot_choices enable row level security;

-- No policies are created for election_participation / election_ballots /
-- election_ballot_choices: RLS is enabled with zero grants, so `anon` and
-- `authenticated` get a hard default-deny. The only access paths are the
-- SECURITY DEFINER functions in 0009 (owned by the migration role, which
-- owns these tables and therefore bypasses RLS) and the service role.

create policy elections_select_eligible on public.elections
  for select using (
    status not in ('draft', 'cancelled')
    and (
      array_length(eligible_grade_level_ids, 1) is null
      or exists (select 1 from public.profiles p where p.id = public.current_profile_id() and p.grade_level_id = any(elections.eligible_grade_level_ids))
    )
  );

create policy elections_select_manage on public.elections
  for select using (public.has_capability('elections.manage') or public.has_capability('elections.publish'));

create policy elections_write_manage on public.elections for insert
  with check (public.has_capability('elections.manage'));

create policy elections_update_manage on public.elections for update
  using (public.has_capability('elections.manage') or public.has_capability('elections.publish'))
  with check (public.has_capability('elections.manage') or public.has_capability('elections.publish'));

create policy elections_delete_manage on public.elections for delete using (public.has_capability('elections.manage'));

-- Opening voting or publishing results is a distinct, more sensitive action
-- (teacher_advisor / super_admin territory) than ordinary editing.
create or replace function public.enforce_election_publish_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('open', 'results_published')
     and not public.has_capability('elections.publish') then
    raise exception 'Publishing an election or its results requires the elections.publish capability.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_election_publish_transition
  before update of status on public.elections
  for each row execute function public.enforce_election_publish_transition();

create policy election_positions_select on public.election_positions for select using (
  exists (select 1 from public.elections e where e.id = election_positions.election_id)
);
create policy election_positions_write_manage on public.election_positions for all
  using (public.has_capability('elections.manage')) with check (public.has_capability('elections.manage'));

create policy election_candidates_select on public.election_candidates for select using (
  exists (select 1 from public.election_positions ep where ep.id = election_candidates.election_position_id)
);
create policy election_candidates_write_manage on public.election_candidates for all
  using (public.has_capability('elections.manage')) with check (public.has_capability('elections.manage'));

create policy election_eligibility_manage on public.election_eligibility for all
  using (public.has_capability('elections.manage')) with check (public.has_capability('elections.manage'));
