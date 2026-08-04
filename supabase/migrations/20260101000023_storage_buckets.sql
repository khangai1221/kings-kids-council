-- =============================================================================
-- 0023: storage buckets and storage.objects policies
--
-- Path convention:
--   - event-assets, council-member-images (admin-authored; the parent entity
--     already exists before the file is attached): "<entity_id>/<file_id>.<ext>"
--   - application-files, suggestion-files (student-initiated; the parent
--     record may not exist yet at upload time — an application answer or a
--     suggestion attachment is often uploaded before the parent row is
--     created): "<uploader_profile_id>/<file_id>.<ext>"
-- Filenames are always server-generated (nanoid), never the original upload
-- name — see lib/storage/upload.ts.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true, 10485760, array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('council-member-images', 'council-member-images', true, 10485760, array['image/png','image/jpeg','image/webp']),
  ('event-assets', 'event-assets', false, 10485760, array['image/png','image/jpeg','image/webp','application/pdf']),
  ('application-files', 'application-files', false, 10485760, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg']),
  ('suggestion-files', 'suggestion-files', false, 10485760, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- public-assets / council-member-images: public read, admin-tier write.
-- ---------------------------------------------------------------------------
create policy storage_public_assets_read on storage.objects for select
  using (bucket_id = 'public-assets');
create policy storage_public_assets_write on storage.objects for insert
  with check (bucket_id = 'public-assets' and public.is_admin_tier());
create policy storage_public_assets_modify on storage.objects for update
  using (bucket_id = 'public-assets' and public.is_admin_tier());
create policy storage_public_assets_delete on storage.objects for delete
  using (bucket_id = 'public-assets' and public.is_admin_tier());

create policy storage_council_images_read on storage.objects for select
  using (bucket_id = 'council-member-images');
create policy storage_council_images_write on storage.objects for insert
  with check (bucket_id = 'council-member-images' and public.has_capability('council.manage'));
create policy storage_council_images_modify on storage.objects for update
  using (bucket_id = 'council-member-images' and public.has_capability('council.manage'));
create policy storage_council_images_delete on storage.objects for delete
  using (bucket_id = 'council-member-images' and public.has_capability('council.manage'));

-- ---------------------------------------------------------------------------
-- event-assets: private. Readable by events.manage, or by anyone who could
-- see the event itself (mirrors the `events` table RLS eligibility check).
-- ---------------------------------------------------------------------------
create policy storage_event_assets_read on storage.objects for select using (
  bucket_id = 'event-assets'
  and (
    public.has_capability('events.manage')
    or exists (
      select 1 from public.events e
      where e.id::text = (storage.foldername(name))[1]
        and e.status not in ('draft', 'archived')
        and (e.visibility = 'public' or public.is_admin_tier() or 'council_member' = any(public.current_effective_roles()))
    )
  )
);
create policy storage_event_assets_write on storage.objects for insert
  with check (bucket_id = 'event-assets' and public.has_capability('events.manage'));
create policy storage_event_assets_modify on storage.objects for update
  using (bucket_id = 'event-assets' and public.has_capability('events.manage'));
create policy storage_event_assets_delete on storage.objects for delete
  using (bucket_id = 'event-assets' and public.has_capability('events.manage'));

-- ---------------------------------------------------------------------------
-- application-files: private, path-scoped to the uploader. Reviewers/admins
-- are authorized via file_records + application_answers/review_assignments,
-- not via the path (they are not the uploader).
-- ---------------------------------------------------------------------------
create policy storage_application_files_read on storage.objects for select using (
  bucket_id = 'application-files'
  and (
    (storage.foldername(name))[1] = public.current_profile_id()::text
    or public.has_capability('applications.manage')
    or exists (
      select 1 from public.file_records fr
      join public.application_answers aa on aa.file_record_id = fr.id
      join public.review_assignments ra on ra.submission_id = aa.submission_id
      where fr.bucket = 'application-files' and fr.storage_path = name and ra.reviewer_id = public.current_profile_id()
    )
  )
);
create policy storage_application_files_write on storage.objects for insert with check (
  bucket_id = 'application-files' and (storage.foldername(name))[1] = public.current_profile_id()::text
);
create policy storage_application_files_delete on storage.objects for delete using (
  bucket_id = 'application-files'
  and ((storage.foldername(name))[1] = public.current_profile_id()::text or public.has_capability('applications.manage'))
);

-- ---------------------------------------------------------------------------
-- suggestion-files: private, path-scoped to the uploader. Admin access is
-- capability-gated only (never derived from the path, since the whole point
-- of anonymous-to-council suggestions is that the path's profile id must
-- not leak the identity to an ordinary council member).
-- ---------------------------------------------------------------------------
create policy storage_suggestion_files_read on storage.objects for select using (
  bucket_id = 'suggestion-files'
  and (
    (storage.foldername(name))[1] = public.current_profile_id()::text
    or public.has_capability('suggestions.manage')
  )
);
create policy storage_suggestion_files_write on storage.objects for insert with check (
  bucket_id = 'suggestion-files' and (storage.foldername(name))[1] = public.current_profile_id()::text
);
create policy storage_suggestion_files_delete on storage.objects for delete using (
  bucket_id = 'suggestion-files' and (storage.foldername(name))[1] = public.current_profile_id()::text
);

-- NOTE: file_size_limit/allowed_mime_types above are the hard backstop matching the
-- *default* site_settings values. If an admin raises the soft limit in site_settings,
-- also raise the matching bucket limit (see DEPLOYMENT.md).
-- (Not a `comment on table storage.buckets` — hosted Supabase projects don't grant
-- the migration role ownership of storage.buckets, so that statement fails with
-- "must be owner of table buckets".)
