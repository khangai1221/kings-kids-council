-- =============================================================================
-- 0009: elections — candidates, secure transactional voting, aggregate results
-- =============================================================================

create table public.elections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  election_type text not null default 'general',
  eligible_grade_level_ids uuid[] not null default '{}',
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status public.election_status not null default 'draft',
  result_visibility public.election_result_visibility not null default 'after_publish',
  turnout_visibility public.election_turnout_visibility not null default 'visible_after_close',
  candidate_order_mode public.election_candidate_order_mode not null default 'alphabetical',
  instructions text,
  confirmation_message text,
  results_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  check (closes_at > opens_at)
);

create index idx_elections_status on public.elections (status);

create table public.election_positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  title text not null,
  max_choices integer not null default 1 check (max_choices >= 1),
  sort_order integer not null default 0
);

create index idx_election_positions_election on public.election_positions (election_id);

create table public.election_candidates (
  id uuid primary key default gen_random_uuid(),
  election_position_id uuid not null references public.election_positions (id) on delete cascade,
  student_id uuid references public.profiles (id) on delete set null,
  candidate_name text not null,
  grade_level_label text,
  photo_url text,
  statement text,
  goals text,
  campaign_document_file_id uuid,
  approval_status public.election_candidate_approval not null default 'pending',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_election_candidates_position on public.election_candidates (election_position_id);

-- Per-student eligibility override on top of the grade-based default.
create table public.election_eligibility (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  is_eligible boolean not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (election_id, profile_id)
);

-- Proof-of-participation only. No ballot content lives here.
create table public.election_participation (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  election_position_id uuid not null references public.election_positions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  voted_at timestamptz not null default now(),
  unique (election_position_id, student_id)
);

create index idx_election_participation_election on public.election_participation (election_id);

-- Ballot envelope — deliberately has NO student reference of any kind.
create table public.election_ballots (
  id uuid primary key default gen_random_uuid(),
  election_position_id uuid not null references public.election_positions (id) on delete cascade,
  cast_at timestamptz not null default now()
);

create table public.election_ballot_choices (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.election_ballots (id) on delete cascade,
  candidate_id uuid references public.election_candidates (id) on delete cascade
);

create index idx_election_ballot_choices_ballot on public.election_ballot_choices (ballot_id);
create index idx_election_ballot_choices_candidate on public.election_ballot_choices (candidate_id);

create trigger trg_elections_updated_at before update on public.elections for each row execute function public.set_updated_at();
create trigger trg_election_candidates_updated_at before update on public.election_candidates for each row execute function public.set_updated_at();

comment on table public.election_ballots is
  'Anonymous by construction: no student_id column exists on this table or election_ballot_choices. Do not add one.';

-- ---------------------------------------------------------------------------
-- Immutability: once an election has opened, its positions/candidates cannot
-- be edited unless the election is paused (or is still draft/scheduled).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_election_content_immutability()
returns trigger
language plpgsql
as $$
declare
  v_election_id uuid;
  v_status public.election_status;
begin
  if tg_table_name = 'election_positions' then
    v_election_id := coalesce(new.election_id, old.election_id);
  else
    select ep.election_id into v_election_id
    from public.election_positions ep
    where ep.id = coalesce(new.election_position_id, old.election_position_id);
  end if;

  select status into v_status from public.elections where id = v_election_id;

  if v_status is not null and v_status not in ('draft', 'scheduled', 'paused') then
    raise exception 'Election content is immutable once voting has opened (status=%). Pause the election to make corrections.', v_status
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger trg_election_positions_immutable
  before update or delete on public.election_positions
  for each row execute function public.enforce_election_content_immutability();

create trigger trg_election_candidates_immutable
  before insert or update or delete on public.election_candidates
  for each row execute function public.enforce_election_content_immutability();

-- ---------------------------------------------------------------------------
-- Secure transactional voting RPC. This is the ONLY way to write to
-- election_participation / election_ballots / election_ballot_choices — no
-- direct table grants are given to the `authenticated` role (see RLS
-- migration), so every vote must pass through this validated, audited path.
--
-- p_ballot shape: [{"position_id": "<uuid>", "candidate_ids": ["<uuid>", ...]}, ...]
-- one entry per election_position belonging to the election, every time.
-- ---------------------------------------------------------------------------
create or replace function public.cast_election_vote(p_election_id uuid, p_ballot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_grade_level_id uuid;
  v_election record;
  v_position record;
  v_position_ids uuid[];
  v_submitted_position_ids uuid[];
  v_entry jsonb;
  v_position_id uuid;
  v_candidate_ids uuid[];
  v_candidate_id uuid;
  v_eligible boolean;
  v_ballot_id uuid;
  v_positions_voted jsonb := '[]'::jsonb;
begin
  v_student_id := public.current_profile_id();
  if v_student_id is null then
    raise exception 'You must be signed in to vote.' using errcode = '28000';
  end if;

  select grade_level_id into v_grade_level_id from public.profiles where id = v_student_id;

  select * into v_election from public.elections where id = p_election_id for update;
  if not found then
    raise exception 'Election not found.' using errcode = 'no_data_found';
  end if;

  if v_election.status <> 'open' then
    raise exception 'This election is not currently open for voting.' using errcode = 'check_violation';
  end if;

  if now() < v_election.opens_at or now() > v_election.closes_at then
    raise exception 'This election is not currently within its voting window.' using errcode = 'check_violation';
  end if;

  select is_eligible into v_eligible
  from public.election_eligibility
  where election_id = p_election_id and profile_id = v_student_id;

  if v_eligible is null then
    v_eligible := v_grade_level_id = any(v_election.eligible_grade_level_ids);
  end if;

  if not coalesce(v_eligible, false) then
    raise exception 'You are not eligible to vote in this election.' using errcode = 'insufficient_privilege';
  end if;

  select array_agg(id) into v_position_ids from public.election_positions where election_id = p_election_id;
  select array_agg((entry ->> 'position_id')::uuid) into v_submitted_position_ids
  from jsonb_array_elements(p_ballot) as entry;

  if v_position_ids is null or v_submitted_position_ids is null
     or array_length(v_position_ids, 1) is distinct from array_length(v_submitted_position_ids, 1)
     or not (v_position_ids <@ v_submitted_position_ids and v_submitted_position_ids <@ v_position_ids) then
    raise exception 'Your ballot must include exactly one choice entry for every position in this election.'
      using errcode = 'check_violation';
  end if;

  for v_entry in select * from jsonb_array_elements(p_ballot)
  loop
    v_position_id := (v_entry ->> 'position_id')::uuid;

    select * into v_position from public.election_positions where id = v_position_id and election_id = p_election_id;
    if not found then
      raise exception 'Invalid position in ballot.' using errcode = 'check_violation';
    end if;

    if exists (
      select 1 from public.election_participation
      where election_position_id = v_position_id and student_id = v_student_id
    ) then
      raise exception 'You have already voted for %.', v_position.title using errcode = 'unique_violation';
    end if;

    select coalesce(array_agg(elem::uuid), '{}')
      into v_candidate_ids
      from jsonb_array_elements_text(coalesce(v_entry -> 'candidate_ids', '[]'::jsonb)) as elem;

    if array_length(v_candidate_ids, 1) is not null and array_length(v_candidate_ids, 1) > v_position.max_choices then
      raise exception 'Too many candidates selected for %.', v_position.title using errcode = 'check_violation';
    end if;

    -- Insert participation FIRST: the unique constraint is the real
    -- concurrency guard against duplicate/refreshed submissions.
    insert into public.election_participation (election_id, election_position_id, student_id)
    values (p_election_id, v_position_id, v_student_id);

    insert into public.election_ballots (election_position_id)
    values (v_position_id)
    returning id into v_ballot_id;

    if v_candidate_ids is null or array_length(v_candidate_ids, 1) is null then
      insert into public.election_ballot_choices (ballot_id, candidate_id) values (v_ballot_id, null);
    else
      foreach v_candidate_id in array v_candidate_ids
      loop
        if not exists (
          select 1 from public.election_candidates
          where id = v_candidate_id and election_position_id = v_position_id and approval_status = 'approved'
        ) then
          raise exception 'One of the selected candidates is not valid for this position.' using errcode = 'check_violation';
        end if;
        insert into public.election_ballot_choices (ballot_id, candidate_id) values (v_ballot_id, v_candidate_id);
      end loop;
    end if;

    v_positions_voted := v_positions_voted || jsonb_build_object('position_id', v_position_id, 'recorded', true);
  end loop;

  return jsonb_build_object('success', true, 'positions', v_positions_voted);
exception
  when unique_violation then
    raise exception 'Your vote was already recorded — duplicate submissions are not allowed.' using errcode = 'unique_violation';
end;
$$;

revoke all on public.election_participation from authenticated, anon;
revoke all on public.election_ballots from authenticated, anon;
revoke all on public.election_ballot_choices from authenticated, anon;
grant execute on function public.cast_election_vote(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Aggregate-only read functions. Ordinary admins never query the ballot
-- tables directly (no SELECT policy is granted on them at all — see RLS
-- migration); every result view goes through these SECURITY DEFINER
-- functions, which also encode the configured result/turnout visibility
-- rules for students.
-- ---------------------------------------------------------------------------
create or replace function public.get_election_results(p_election_id uuid)
returns table (
  position_id uuid,
  position_title text,
  candidate_id uuid,
  candidate_name text,
  vote_count bigint,
  vote_percentage numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_election record;
  v_can_preview boolean;
begin
  select * into v_election from public.elections where id = p_election_id;
  if not found then
    raise exception 'Election not found.' using errcode = 'no_data_found';
  end if;

  v_can_preview := public.has_capability('elections.manage') or public.has_capability('elections.publish');

  if not v_can_preview then
    if v_election.result_visibility = 'after_publish' and v_election.status <> 'results_published' then
      raise exception 'Results have not been published yet.' using errcode = 'insufficient_privilege';
    elsif v_election.result_visibility = 'after_close' and v_election.status not in ('closed', 'results_published') then
      raise exception 'Results are not available until the election closes.' using errcode = 'insufficient_privilege';
    elsif v_election.result_visibility = 'manual' and v_election.status <> 'results_published' then
      raise exception 'Results have not been released yet.' using errcode = 'insufficient_privilege';
    end if;
  end if;

  return query
    with counted as (
      select
        ep.id as position_id,
        ep.title as position_title,
        ec.id as candidate_id,
        ec.candidate_name,
        count(ebc.id) filter (where ebc.candidate_id is not null and ebc.candidate_id = ec.id) as vote_count
      from public.election_positions ep
      left join public.election_candidates ec
        on ec.election_position_id = ep.id and ec.approval_status = 'approved'
      left join public.election_ballots eb on eb.election_position_id = ep.id
      left join public.election_ballot_choices ebc
        on ebc.ballot_id = eb.id and ebc.candidate_id = ec.id
      where ep.election_id = p_election_id
      group by ep.id, ep.title, ec.id, ec.candidate_name
    ),
    totals as (
      select c.position_id, sum(c.vote_count) as total_votes
      from counted c
      group by c.position_id
    )
    select
      c.position_id,
      c.position_title,
      c.candidate_id,
      c.candidate_name,
      c.vote_count,
      case when t.total_votes > 0 then round(100.0 * c.vote_count / t.total_votes, 1) else 0 end as vote_percentage
    from counted c
    join totals t on t.position_id = c.position_id
    order by c.position_title, c.vote_count desc nulls last;
end;
$$;

create or replace function public.get_election_turnout(p_election_id uuid)
returns table (
  total_eligible bigint,
  total_votes bigint,
  turnout_percentage numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_election record;
  v_can_preview boolean;
begin
  select * into v_election from public.elections where id = p_election_id;
  if not found then
    raise exception 'Election not found.' using errcode = 'no_data_found';
  end if;

  v_can_preview := public.has_capability('elections.manage') or public.has_capability('elections.publish');

  if not v_can_preview then
    if v_election.turnout_visibility = 'hidden' then
      raise exception 'Turnout is not available for this election.' using errcode = 'insufficient_privilege';
    elsif v_election.turnout_visibility = 'visible_after_close' and v_election.status not in ('closed', 'results_published') then
      raise exception 'Turnout is not available until the election closes.' using errcode = 'insufficient_privilege';
    end if;
  end if;

  return query
    with eligible as (
      select p.id
      from public.profiles p
      left join public.election_eligibility ee on ee.election_id = p_election_id and ee.profile_id = p.id
      where p.account_status = 'active'
        and coalesce(ee.is_eligible, p.grade_level_id = any(v_election.eligible_grade_level_ids))
    ),
    voted as (
      select distinct student_id from public.election_participation where election_id = p_election_id
    )
    select
      (select count(*) from eligible) as total_eligible,
      (select count(*) from voted) as total_votes,
      case when (select count(*) from eligible) > 0
        then round(100.0 * (select count(*) from voted) / (select count(*) from eligible), 1)
        else 0
      end as turnout_percentage;
end;
$$;

comment on function public.get_election_results(uuid) is
  'The only supported way to read election outcomes. Raw election_ballots/election_ballot_choices rows are not selectable directly.';

-- Lets a student check their OWN voting status per position (never anyone
-- else's) without granting any direct access to election_participation.
create or replace function public.has_voted_for_position(p_election_position_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.election_participation
    where election_position_id = p_election_position_id and student_id = public.current_profile_id()
  );
$$;

grant execute on function public.has_voted_for_position(uuid) to authenticated;
