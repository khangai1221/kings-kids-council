-- =============================================================================
-- 0022: RLS — notifications, push subscriptions, files, audit log, rate limits
-- =============================================================================

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.file_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limit_records enable row level security;

create policy notifications_select_self on public.notifications for select using (user_id = public.current_profile_id());
create policy notifications_update_self on public.notifications for update
  using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
-- No direct INSERT policy: all rows are created via create_notification().

create policy notification_preferences_all_self on public.notification_preferences for all
  using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());

create policy push_subscriptions_all_self on public.push_subscriptions for all
  using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());

-- Broadcasting a notification (e.g. an urgent announcement) needs to read
-- recipients' tokens; device tokens are opaque and not personally sensitive.
create policy push_subscriptions_select_broadcast on public.push_subscriptions for select
  using (public.has_capability('notifications.manage') or public.is_admin_tier());

create policy file_records_select_self on public.file_records for select using (uploaded_by = public.current_profile_id());
create policy file_records_select_admin on public.file_records for select using (public.is_admin_tier());
create policy file_records_insert_self on public.file_records for insert with check (uploaded_by = public.current_profile_id());
create policy file_records_delete_admin on public.file_records for delete using (public.is_admin_tier());

create policy audit_logs_select_view on public.audit_logs for select using (public.has_capability('audit.view'));
create policy audit_logs_insert_self on public.audit_logs for insert
  with check (actor_id = public.current_profile_id() or auth.role() = 'service_role');

-- rate_limit_records: no client-facing policies at all. The only access path
-- is check_rate_limit(), a SECURITY DEFINER function owned by the migration
-- role, which bypasses RLS on the tables it owns.
