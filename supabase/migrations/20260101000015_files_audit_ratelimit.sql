-- =============================================================================
-- 0015: file records, audit log, rate limiting — plus deferred file_record FKs
-- =============================================================================

create table public.file_records (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  storage_path text not null,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  checksum text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  purpose text not null,
  created_at timestamptz not null default now()
);

create index idx_file_records_uploaded_by on public.file_records (uploaded_by);

alter table public.application_answers
  add constraint fk_application_answers_file foreign key (file_record_id) references public.file_records (id) on delete set null;

alter table public.election_candidates
  add constraint fk_election_candidates_file foreign key (campaign_document_file_id) references public.file_records (id) on delete set null;

alter table public.event_attachments
  add constraint fk_event_attachments_file foreign key (file_record_id) references public.file_records (id) on delete cascade;

alter table public.suggestions
  add constraint fk_suggestions_file foreign key (attachment_file_id) references public.file_records (id) on delete set null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  request_metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_resource on public.audit_logs (resource_type, resource_id);
create index idx_audit_logs_actor on public.audit_logs (actor_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at desc);

comment on table public.audit_logs is
  'Never store passwords, tokens, private keys, or full sensitive file contents here.';

create table public.rate_limit_records (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  unique (bucket_key, window_start)
);

create index idx_rate_limit_records_bucket on public.rate_limit_records (bucket_key, window_start desc);

-- Fixed-window rate limiter. Returns true when the request is allowed.
-- bucket_key is caller-constructed, e.g. 'suggestion_submit:<profile_id>'.
create or replace function public.check_rate_limit(p_bucket_key text, p_window_seconds integer, p_max_requests integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_records (bucket_key, window_start, request_count)
  values (p_bucket_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set request_count = public.rate_limit_records.request_count + 1
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to authenticated;

-- Housekeeping: old rate-limit windows can be pruned periodically (see
-- README "Troubleshooting" for wiring this to a scheduled job).
create or replace function public.prune_rate_limit_records(p_older_than interval default interval '1 day')
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_records where window_start < now() - p_older_than;
$$;
