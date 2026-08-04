# Deployment checklist

Target: Vercel (Next.js) + Supabase (hosted Postgres/Storage) + Clerk (production instance) +
Firebase Cloud Messaging, served from a custom domain such as `council.kingskids.mn`.

## 1. Supabase (production project)

- [ ] Create a production Supabase project (separate from any dev/staging project).
- [ ] `supabase link --project-ref <ref>` then `pnpm db:push` to apply every migration in
      `supabase/migrations/`.
- [ ] Verify RLS is enabled on every table: `select tablename from pg_tables where schemaname='public' and rowsecurity=false;`
      should return **zero rows**.
- [ ] Verify storage buckets exist with the right `public` flag:
      `public-assets`/`council-member-images` public; `event-assets`/`application-files`/`suggestion-files` private.
- [ ] Do **not** run `supabase/seed.sql` against production (it contains fictional but
      structurally-real accounts) — see "Remove development seed accounts" below if you did.
- [ ] Configure Authentication → Third Party Auth → Clerk with your **production** Clerk Frontend
      API domain (different from your dev/test Clerk instance's domain).
- [ ] Note the project URL, anon key, and service role key for the Vercel env vars below.

## 2. Clerk (production instance)

- [ ] Create a **production** Clerk instance (do not reuse the dev instance's keys).
- [ ] Configure → Restrictions → allowlist `@kingskids.mn` (or your school's real domain).
- [ ] Configure → Integrations → Supabase → enable, copy the Frontend API domain into the
      Supabase Third Party Auth config from step 1.
- [ ] Configure → Webhooks → Add Endpoint → `https://council.kingskids.mn/api/webhooks/clerk`,
      subscribe to `user.created`, `user.updated`, `user.deleted`. Copy the signing secret.
- [ ] Configure → Paths: sign-in `/sign-in`, sign-up `/sign-up`, after sign-in `/dashboard`,
      after sign-up `/onboarding`.

## 3. Firebase Cloud Messaging

- [ ] Create (or reuse) a Firebase project. Add a Web app for the production domain.
- [ ] Cloud Messaging → Web configuration → generate a Web Push certificate (VAPID key).
- [ ] Project settings → Service accounts → generate a private key for the Admin SDK.
- [ ] Confirm the production domain is in Firebase's authorized domains list (Auth settings,
      even though we don't use Firebase Auth — some Firebase features check this).

## 4. Vercel

- [ ] Import the repository into Vercel.
- [ ] Set every variable from `.env.example` in Vercel → Settings → Environment Variables,
      using the **production** Clerk/Supabase/Firebase values from steps 1–3. Double-check
      `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `FIREBASE_PRIVATE_KEY` are only set
      as server-side (not `NEXT_PUBLIC_`) variables.
- [ ] `NEXT_PUBLIC_APP_URL=https://council.kingskids.mn`.
- [ ] Configure the custom domain (`council.kingskids.mn`) in Vercel → Settings → Domains;
      follow Vercel's DNS instructions. HTTPS is automatic via Vercel.
- [ ] Trigger a deploy and confirm the build succeeds (`pnpm build` runs `next build`).

## 5. Post-deploy verification

- [ ] **CSP**: open the deployed site's dev tools console — confirm no CSP violation errors for
      Clerk, Supabase, or Firebase requests (see `next.config.ts` `headers()`). Adjust the
      `connect-src`/`script-src`/`frame-src` directives there if your Clerk Frontend API domain
      differs from what's inferred from the publishable key.
- [ ] **Unauthorized email rejection**: attempt sign-up with a non-school email; confirm it's
      blocked at the Clerk allowlist (should never reach the app), then also test with a school
      email that somehow bypassed the allowlist by temporarily disabling it in a staging
      environment — confirm `/unauthorized` is shown and the session is cleared.
- [ ] **Student permissions**: sign in as a plain student; confirm `/admin` redirects to
      `/unauthorized`, and the student cannot open another student's `/applications/submissions/:id`.
- [ ] **Reviewer permissions**: assign a review, confirm the reviewer sees it at `/admin/reviews`
      and cannot open an application they are not assigned to.
- [ ] **Election duplicate-vote prevention**: open a test election, vote once, then attempt to
      vote again (e.g. resubmit the same request) — confirm the second attempt is rejected and
      no second ballot/participation row was created.
- [ ] **Push notification**: enable push in Settings on a real device/browser, trigger a
      notification (e.g. publish an urgent announcement), confirm it arrives.
- [ ] **Webhook**: create a test Clerk account, confirm a matching `profiles` row appears in
      Supabase within a few seconds.
- [ ] **Backup procedure**: confirm Supabase's automated backups are enabled for the production
      project (Settings → Database → Backups) and note the retention window; a hosted project on
      a paid plan includes point-in-time recovery — verify this matches your school's data
      retention requirements before go-live.

## 6. First Super Admin

- [ ] Sign in once with your own `@kingskids.mn` account through the real production app.
- [ ] In the Supabase SQL editor for the **production** project:
      ```sql
      update public.profiles set role = 'super_admin' where school_email = 'you@kingskids.mn';
      ```
- [ ] Confirm you can reach `/admin/settings` and `/admin/roles`.

## 7. Remove development seed accounts

If `supabase/seed.sql` was ever accidentally applied to the production database:

```sql
delete from public.profiles where clerk_user_id like 'user_seed_%';
```

Foreign keys cascade to remove the seeded council members, submissions, etc. that reference
those profiles; content not owned by a seed profile (e.g. lookup tables, reference data from the
migrations themselves) is untouched.

## 8. Ongoing maintenance

- Schedule `select public.prune_rate_limit_records();` periodically (Supabase → Database →
  Cron, or an external scheduler calling a Route Handler that invokes it) to keep
  `rate_limit_records` from growing unbounded.
- Review `/admin/audit` periodically, especially `suggestion_identity_access` and
  `user.role_changed` entries.
- If you raise `site_settings.file_upload_max_size_bytes` above the current 10MB default, also
  raise the matching `storage.buckets.file_size_limit` for each bucket (see the comment in
  `supabase/migrations/20260101000023_storage_buckets.sql`) — the bucket limit is a hard
  backstop and won't move automatically.
