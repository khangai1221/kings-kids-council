-- =============================================================================
-- 0026: RLS for polls + the polls.manage capability seed
-- =============================================================================

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

revoke insert, update, delete on public.poll_votes from authenticated, anon;

create policy polls_select_eligible on public.polls for select using (
  status not in ('draft', 'archived')
  and (
    array_length(eligible_grade_level_ids, 1) is null
    or exists (select 1 from public.profiles p where p.id = public.current_profile_id() and p.grade_level_id = any(polls.eligible_grade_level_ids))
  )
);
create policy polls_select_manage on public.polls for select using (public.has_capability('polls.manage'));
create policy polls_write_manage on public.polls for all
  using (public.has_capability('polls.manage')) with check (public.has_capability('polls.manage'));

create policy poll_options_select on public.poll_options for select using (
  exists (
    select 1 from public.polls p
    where p.id = poll_options.poll_id
      and (p.status not in ('draft', 'archived') or public.has_capability('polls.manage'))
  )
);
create policy poll_options_write_manage on public.poll_options for all
  using (public.has_capability('polls.manage')) with check (public.has_capability('polls.manage'));

create policy poll_votes_select_self on public.poll_votes for select using (student_id = public.current_profile_id());
create policy poll_votes_select_manage on public.poll_votes for select using (public.has_capability('polls.manage'));

insert into public.permissions (key, label, description, category) values
  ('polls.manage', 'Manage polls', 'Create/edit/publish polls and view results.', 'polls');

insert into public.role_permissions (role_key, permission_key) values
  ('admin', 'polls.manage');
