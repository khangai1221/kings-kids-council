-- =============================================================================
-- 0025: polls — single-question, one-vote-per-student polls. Distinct from
-- the versioned form-builder `surveys` system: a poll is one question with a
-- fixed set of options and a simple tally, not a multi-question form.
-- =============================================================================

create type public.poll_status as enum ('draft', 'open', 'closed', 'archived');

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  status public.poll_status not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  eligible_grade_level_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  check (opens_at is null or closes_at is null or closes_at >= opens_at)
);

create index idx_polls_status on public.polls (status);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create index idx_poll_options_poll on public.poll_options (poll_id);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  voted_at timestamptz not null default now(),
  unique (poll_id, student_id)
);

create index idx_poll_votes_poll_option on public.poll_votes (poll_id, option_id);
create index idx_poll_votes_student on public.poll_votes (student_id);

create trigger trg_polls_updated_at before update on public.polls for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Voting RPC: locks the poll row, validates status/window/eligibility/option
-- membership, then records the vote. Mirrors register_for_event's locking
-- and error-handling style.
-- ---------------------------------------------------------------------------
create or replace function public.cast_poll_vote(p_poll_id uuid, p_option_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_grade_level_id uuid;
  v_poll record;
  v_vote_id uuid;
begin
  v_student_id := public.current_profile_id();
  if v_student_id is null then
    raise exception 'You must be signed in to vote.' using errcode = '28000';
  end if;

  select grade_level_id into v_grade_level_id from public.profiles where id = v_student_id;
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then
    raise exception 'Poll not found.' using errcode = 'no_data_found';
  end if;

  if v_poll.status <> 'open' then
    raise exception 'This poll is not open for voting.' using errcode = 'check_violation';
  end if;

  if (v_poll.opens_at is not null and now() < v_poll.opens_at)
     or (v_poll.closes_at is not null and now() > v_poll.closes_at) then
    raise exception 'This poll is not currently open for voting.' using errcode = 'check_violation';
  end if;

  if array_length(v_poll.eligible_grade_level_ids, 1) is not null
     and not (v_grade_level_id = any(v_poll.eligible_grade_level_ids)) then
    raise exception 'You are not eligible to vote in this poll.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.poll_options where id = p_option_id and poll_id = p_poll_id) then
    raise exception 'Invalid option for this poll.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.poll_votes where poll_id = p_poll_id and student_id = v_student_id) then
    raise exception 'You have already voted in this poll.' using errcode = 'unique_violation';
  end if;

  insert into public.poll_votes (poll_id, option_id, student_id)
  values (p_poll_id, p_option_id, v_student_id)
  returning id into v_vote_id;

  return jsonb_build_object('vote_id', v_vote_id, 'option_id', p_option_id);
exception
  when unique_violation then
    raise exception 'You have already voted in this poll.' using errcode = 'unique_violation';
end;
$$;

grant execute on function public.cast_poll_vote(uuid, uuid) to authenticated;

-- Aggregate-only vote counts, safe to expose beyond manage-tier since it
-- never reveals who voted for what (unlike a raw poll_votes select).
create or replace function public.get_poll_option_counts(p_poll_id uuid)
returns table (option_id uuid, votes bigint)
language sql
security definer
set search_path = public
stable
as $$
  select po.id as option_id, count(pv.id) as votes
  from public.poll_options po
  left join public.poll_votes pv on pv.option_id = po.id
  where po.poll_id = p_poll_id
  group by po.id;
$$;

grant execute on function public.get_poll_option_counts(uuid) to authenticated;
