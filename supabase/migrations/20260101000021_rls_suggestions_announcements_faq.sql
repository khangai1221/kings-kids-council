-- =============================================================================
-- 0021: RLS — suggestions (with identity-mapping split), announcements, FAQ
-- =============================================================================

alter table public.suggestion_categories enable row level security;
alter table public.suggestions enable row level security;
alter table public.suggestion_identity_mappings enable row level security;
alter table public.suggestion_replies enable row level security;
alter table public.suggestion_internal_notes enable row level security;
alter table public.suggestion_status_history enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.faq_categories enable row level security;
alter table public.faqs enable row level security;
alter table public.faq_feedback enable row level security;

create policy suggestion_categories_select_all on public.suggestion_categories for select using (true);
create policy suggestion_categories_write_manage on public.suggestion_categories for all
  using (public.has_capability('suggestions.manage')) with check (public.has_capability('suggestions.manage'));

-- The submitter can always find their own mapping row; nobody else can
-- (reveal_suggestion_identity() is the only other path, and it is audited).
create policy suggestion_identity_mappings_select_self on public.suggestion_identity_mappings
  for select using (student_id = public.current_profile_id());

create or replace function public.owns_suggestion(p_suggestion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.suggestions s
    where s.id = p_suggestion_id
      and (
        s.student_id = public.current_profile_id()
        or exists (
          select 1 from public.suggestion_identity_mappings sim
          where sim.suggestion_id = s.id and sim.student_id = public.current_profile_id()
        )
      )
  );
$$;

create policy suggestions_select_self on public.suggestions for select using (public.owns_suggestion(id));
create policy suggestions_select_manage on public.suggestions for select using (public.has_capability('suggestions.manage'));
create policy suggestions_update_manage on public.suggestions for update
  using (public.has_capability('suggestions.manage')) with check (public.has_capability('suggestions.manage'));
-- No direct INSERT policy: all submissions go through submit_suggestion().

create policy suggestion_replies_select on public.suggestion_replies for select using (
  public.owns_suggestion(suggestion_id) or public.has_capability('suggestions.manage')
);
create policy suggestion_replies_insert_self on public.suggestion_replies for insert with check (
  author_type = 'student' and author_id = public.current_profile_id() and public.owns_suggestion(suggestion_id)
);
create policy suggestion_replies_insert_admin on public.suggestion_replies for insert with check (
  author_type = 'admin' and public.has_capability('suggestions.manage')
);

create policy suggestion_internal_notes_manage on public.suggestion_internal_notes for all
  using (public.has_capability('suggestions.manage')) with check (public.has_capability('suggestions.manage'));

create policy suggestion_status_history_select on public.suggestion_status_history for select using (
  public.owns_suggestion(suggestion_id) or public.has_capability('suggestions.manage')
);

-- ---------------------------------------------------------------------------
-- announcements — audience + grade + publish window are all enforced here,
-- not just in the UI.
-- ---------------------------------------------------------------------------
create policy announcements_select_published on public.announcements for select using (
  status = 'published'
  and (publish_at is null or publish_at <= now())
  and (expires_at is null or expires_at > now())
  and (
    audience = 'all_students'
    or (audience = 'selected_grades' and exists (
      select 1 from public.profiles p where p.id = public.current_profile_id() and p.grade_level_id = any(announcements.eligible_grade_level_ids)
    ))
    or (audience = 'council_members' and 'council_member' = any(public.current_effective_roles()))
    or (audience = 'reviewers' and 'reviewer' = any(public.current_effective_roles()))
    or (audience = 'admins' and public.is_admin_tier())
    or (audience = 'custom' and public.current_profile_id() = any(announcements.custom_audience_user_ids))
  )
);
create policy announcements_select_manage on public.announcements for select using (public.has_capability('announcements.manage'));
create policy announcements_write_manage on public.announcements for all
  using (public.has_capability('announcements.manage')) with check (public.has_capability('announcements.manage'));

create policy announcement_reads_all_self on public.announcement_reads for all
  using (student_id = public.current_profile_id()) with check (student_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- FAQ
-- ---------------------------------------------------------------------------
create policy faq_categories_select_all on public.faq_categories for select using (true);
create policy faq_categories_write_manage on public.faq_categories for all
  using (public.has_capability('faq.manage')) with check (public.has_capability('faq.manage'));

create policy faqs_select_published on public.faqs for select using (status = 'published');
create policy faqs_select_manage on public.faqs for select using (public.has_capability('faq.manage'));
create policy faqs_write_manage on public.faqs for all
  using (public.has_capability('faq.manage')) with check (public.has_capability('faq.manage'));

create policy faq_feedback_insert_self on public.faq_feedback for insert with check (student_id = public.current_profile_id());
create policy faq_feedback_select_manage on public.faq_feedback for select using (public.has_capability('faq.manage'));
