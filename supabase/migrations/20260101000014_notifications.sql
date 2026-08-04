-- =============================================================================
-- 0014: unified notifications (in-app rows + FCM push subscriptions)
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null default 'general',
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  read_at timestamptz,
  delivery_status public.notification_delivery_status not null default 'pending',
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_notifications_unread on public.notifications (user_id) where not is_read;

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default true,
  category_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  fcm_token text not null unique,
  device_label text,
  browser text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index idx_push_subscriptions_user on public.push_subscriptions (user_id) where enabled;

create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- Every profile gets a default preferences row so the rest of the app never
-- has to special-case a missing row.
create or replace function public.create_default_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id, in_app_enabled, push_enabled)
  values (new.id, new.notification_in_app_default, new.notification_push_default)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger trg_profiles_default_notification_preferences
  after insert on public.profiles
  for each row execute function public.create_default_notification_preferences();

-- ---------------------------------------------------------------------------
-- create_notification: the only supported way to insert a notification for
-- someone other than yourself. Callable by the recipient themselves (e.g. a
-- self-confirmation), any admin-tier user (fan-out from an admin action), or
-- the service role (background/webhook code). lib/notifications/service.ts
-- is the single application-layer entry point that calls this and then
-- triggers the FCM push in the same request.
-- ---------------------------------------------------------------------------
create or replace function public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_link text default null,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_caller uuid;
begin
  v_caller := public.current_profile_id();

  if not (v_caller = p_user_id or public.is_admin_tier() or auth.role() = 'service_role') then
    raise exception 'Not authorized to create notifications for other users.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.notifications (user_id, type, title, message, link, related_entity_type, related_entity_id)
  values (p_user_id, p_type, p_title, p_message, p_link, p_related_entity_type, p_related_entity_id)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_notification(uuid, public.notification_type, text, text, text, text, uuid) to authenticated;

create or replace function public.mark_notification_delivery(p_id uuid, p_status public.notification_delivery_status)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications set delivery_status = p_status where id = p_id;
$$;

grant execute on function public.mark_notification_delivery(uuid, public.notification_delivery_status) to authenticated;
