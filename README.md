# YM Student Council Portal

A private student council platform for King's Kids School. Students sign in with a verified
`@kingskids.mn` school email to apply for council positions, vote in elections, complete surveys,
register for events, submit suggestions, and read announcements/FAQs. Administrators manage every
part of the portal — forms, applications, elections, surveys, events, suggestions, announcements,
FAQs, users/roles, and site settings — without touching code.

## 1. Product overview

See the full feature list in the sections below. Highlights:

- **Identity**: Clerk is the only identity provider. Sign-in is restricted to verified
  `@kingskids.mn` accounts, enforced at five independent layers (see [Email restriction](#4-email-restriction)).
- **Applications**: a reusable drag-and-drop form builder (15 question types, versioned,
  conditional logic) powers council applications, surveys, and event registration.
- **Elections**: ballots are cryptographically separated from participation records at the
  database level — no table, not even for admins, can join "who voted" to "what they voted for."
- **Suggestions**: students can submit anonymously-to-council; only a teacher advisor or Super
  Admin can reveal that identity, and every reveal is written to the audit log.
- **Notifications**: in-app notifications plus opt-in Firebase Cloud Messaging browser push.

## 2. Architecture

Responsibilities are deliberately kept separate between the three backing services:

| Service | Responsibility |
|---|---|
| **Clerk** | Identity, login/logout, sessions, verified email, account security, auth middleware (`proxy.ts`) |
| **Supabase (Postgres)** | All application data: profiles, roles/permissions, applications, elections, surveys, events, suggestions, announcements, FAQs, notifications, audit logs, file metadata, storage |
| **Firebase** | Browser push notification delivery only — device tokens and FCM send/receive. Never a system of record for business data. |

Clerk and Supabase are linked via Supabase's **native third-party auth integration** (not the
deprecated JWT-template method): Supabase verifies Clerk-issued JWTs directly against Clerk's
JWKS, so the Supabase client just needs an `accessToken()` callback that returns
`(await auth()).getToken()` — see `lib/supabase/server.ts`.

### Stack

- Next.js 16 (App Router), TypeScript strict mode, Server Components by default
- Tailwind CSS v4 + shadcn/ui + Lucide icons
- React Hook Form + Zod (client and server validation)
- TanStack Table, Recharts, date-fns, @dnd-kit (form builder question reordering)
- Supabase (Postgres, RLS, Storage, Realtime) — system of record
- Clerk (`@clerk/nextjs`) — identity only
- Firebase (client SDK + Admin SDK) — push notifications only
- Vitest + Testing Library (unit/component), Playwright + `@clerk/testing` (e2e)
- pnpm

### Project structure

```
app/                    Routes (App Router). (portal) = student shell, admin = admin shell
  api/                  Route handlers: Clerk webhook, ICS download, CSV exports, FCM service worker
components/
  ui/                   shadcn/ui primitives
  layout/                App shell, nav, notification bell, command menu
  forms/                 Dynamic form renderer (student-facing) — 15 question types
  admin/forms/            Dynamic form builder (admin-facing) — drag & drop, conditional logic editor
  shared/                 Status badges, empty/error states, data table, page header, confirm dialog
actions/                Server Actions, one file per domain
lib/
  auth/                  current-user resolution, requireX/assertX guards, domain check
  supabase/               Request-scoped client, admin (service-role) client, browser client
  firebase/               Client + Admin SDK wrappers, Analytics (disabled by default)
  permissions/            Role/capability model (pure, unit-tested)
  forms/                  Form hydration, conditional visibility, answer validation (pure, unit-tested)
  notifications/          Unified in-app + push notification service
  audit/                  Centralized audit logging
  storage/                Safe file upload + signed URL helpers
  settings/               Typed site-settings accessor
supabase/
  migrations/             Numbered SQL migrations (schema, RLS, storage policies, RPCs)
  seed.sql                 Fictional demo data
  tests/database/          pgTAP tests (RLS, constraints, election/suggestion privacy)
tests/
  unit/, component/        Vitest
  e2e/                      Playwright (unauthenticated/student/reviewer/admin projects)
```

## 3. Roles and permissions

Six roles: `student`, `council_member`, `reviewer`, `admin`, `teacher_advisor`, `super_admin`.
The authoritative role lives in `profiles.role` in Supabase (never trust Clerk metadata alone).
Fine-grained capabilities (`applications.manage`, `elections.publish`, `suggestions.manage_restricted`,
etc.) are stored in `role_permissions` and editable from `/admin/roles` — admins can grant
`council_member` extra capabilities without a code change. Every protected Server
Component/Action/Route Handler calls a `requireX`/`assertX` guard (`lib/auth/require.ts`) **and**
Postgres RLS enforces the same rule independently — hiding a button is never the only protection.

## 4. Email restriction

Enforced at five layers, per the spec:

1. Clerk signup allowlist (dashboard config — see [Clerk configuration](#clerk-configuration)).
2. `lib/auth/current-user.ts` re-verifies the primary email against `ALLOWED_EMAIL_DOMAIN` on
   first login (handles the case where the `user.created` webhook hasn't landed yet).
3. The Clerk webhook (`lib/webhooks/clerk-sync.ts`) re-checks on every `user.created`/`user.updated`
   event, so a later email change is also caught.
4. The onboarding page requires an already-verified, domain-checked profile to exist.
5. Every `requireOnboardedUser()`/`requireCapability()` call re-checks `account_status = 'active'`
   and the domain, so a compromised frontend can never bypass this.

Unauthorized users are redirected to `/unauthorized` and signed out client-side
(`components/auth/unauthorized-sign-out.tsx`).

## 5. Local development setup

### Prerequisites

- Node.js 20.9+ and pnpm (`corepack enable` or `npm i -g pnpm`)
- A Clerk application (test instance is fine for local dev)
- A Supabase project (hosted, or the Supabase CLI + Docker for a fully local stack)
- A Firebase project (optional locally — push notifications degrade gracefully when unset)

### Install

```bash
pnpm install
cp .env.example .env.local   # fill in the values below
```

### Clerk configuration

1. Create a Clerk application at https://dashboard.clerk.com.
2. Copy the publishable/secret keys into `.env.local`.
3. **School-domain allowlist**: Configure → Restrictions → add an allowlist rule for
   `@kingskids.mn` (or your `ALLOWED_EMAIL_DOMAIN`). This is layer 1 of 5 — see above.
4. **Supabase integration**: Configure → Integrations → Supabase → enable it, copy the shown
   Clerk Frontend API domain into `CLERK_FRONTEND_API_DOMAIN` (used by `supabase/config.toml`
   for local dev, and needed again in the hosted Supabase dashboard — see below).
5. **Webhook**: Configure → Webhooks → Add Endpoint →
   `https://<your-app-url>/api/webhooks/clerk`, subscribe to `user.created`, `user.updated`,
   `user.deleted`. Copy the signing secret into `CLERK_WEBHOOK_SECRET`.

### Supabase project setup

1. Create a project at https://supabase.com/dashboard (or run `pnpm db:start` for a local stack
   via the Supabase CLI + Docker).
2. Copy the project URL, anon key, and service role key into `.env.local`.
3. **Third-party auth (Clerk) integration** — hosted project: Dashboard → Authentication →
   Third Party Auth → Add provider → Clerk → paste your Clerk domain.
   Local dev: already configured in `supabase/config.toml` under `[auth.third_party.clerk]`,
   reading `CLERK_FRONTEND_API_DOMAIN` from your environment.
4. Apply migrations:

   ```bash
   # Local stack:
   pnpm db:start
   pnpm db:reset        # applies every migration in supabase/migrations + supabase/seed.sql

   # Hosted project (after `supabase login` and `supabase link --project-ref <ref>`):
   pnpm db:push
   ```

5. Storage buckets (`public-assets`, `event-assets`, `application-files`, `suggestion-files`,
   `council-member-images`) and their RLS policies are created by
   `supabase/migrations/20260101000023_storage_buckets.sql` — no manual dashboard steps needed.

### Firebase project setup (optional locally)

1. Create a project at https://console.firebase.google.com.
2. Add a Web app; copy the config values into the `NEXT_PUBLIC_FIREBASE_*` variables.
3. Cloud Messaging → Web configuration → generate a **Web Push certificate (VAPID key)** → copy
   into `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
4. Project settings → Service accounts → Generate new private key → copy `project_id`,
   `client_email`, and `private_key` into `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` /
   `FIREBASE_PRIVATE_KEY`. Keep the `\n` sequences literal in the single-line env value —
   `lib/firebase/admin.ts` unescapes them.
5. If any Firebase env var is missing, push notifications are simply disabled (checked via
   `isFirebaseMessagingConfigured` / `isFirebaseAdminConfigured`) — nothing else breaks.

### Seed data

`supabase/seed.sql` runs automatically with `pnpm db:reset` and seeds fictional students, staff,
a council term/positions/members, published forms (application/survey/event-registration), an
open application campaign with one under-review and one draft submission, a draft election, an
open survey, three events, three announcements, FAQ entries, and two suggestions (one identified,
one anonymous-to-council). See the comment at the top of that file for how to connect a real
Clerk test account to a seeded profile.

### Run

```bash
pnpm dev
```

Visit http://localhost:3000. Sign up with an `@kingskids.mn`-style email (or whatever domain you
configured) — the first sign-in redirects to `/onboarding`.

### Creating the first Super Admin

Seed data already includes one (`bilguun.s@kingskids.mn`, `clerk_user_id = 'user_seed_superadmin'`)
for local development. For a real deployment, sign up normally, then promote yourself once via the
Supabase SQL editor (there is no UI path to create the *first* Super Admin, by design — only an
existing Super Admin can grant that role afterward):

```sql
update public.profiles set role = 'super_admin' where school_email = 'you@kingskids.mn';
```

## 6. Testing

```bash
pnpm test              # Vitest — unit + component tests
pnpm test:watch
pnpm test:e2e           # Playwright — requires a running app + seeded database
```

Playwright e2e tests are organized by persona (`tests/e2e/unauthenticated`, `student`, `reviewer`,
`admin`). Authenticated projects reuse a Clerk-testing storage state generated by
`tests/e2e/global.setup.ts`, which provisions three throwaway Clerk test users via the
`+clerk_test` email convention (Clerk auto-verifies these without sending real email). Set:

```
E2E_CLERK_STUDENT_EMAIL=e2e-student+clerk_test@kingskids.mn
E2E_CLERK_STUDENT_PASSWORD=...
E2E_CLERK_REVIEWER_EMAIL=e2e-reviewer+clerk_test@kingskids.mn
E2E_CLERK_REVIEWER_PASSWORD=...
E2E_CLERK_ADMIN_EMAIL=e2e-admin+clerk_test@kingskids.mn
E2E_CLERK_ADMIN_PASSWORD=...
E2E_CLERK_ONBOARDING_EMAIL=e2e-onboarding+clerk_test@kingskids.mn
E2E_CLERK_ONBOARDING_PASSWORD=...
```

A project without these variables set will skip the corresponding tests rather than fail.

Database-level tests (RLS, constraints, election/suggestion privacy, permission helpers) are
pgTAP tests under `supabase/tests/database/`, run with `supabase test db` (requires the Supabase
CLI + Docker).

## 7. Production deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full checklist (Vercel, custom domain, production
Clerk instance, Supabase production project, Firebase, CSP, security checklist).

## 8. Troubleshooting

- **"Invalid public/server environment variables"** at boot — `lib/env.client.ts` /
  `lib/env.server.ts` validate every required variable with Zod at startup; the console error
  lists exactly which one is missing or malformed.
- **Webhook signature failures** — confirm `CLERK_WEBHOOK_SECRET` matches the endpoint shown in
  the Clerk dashboard, and that the endpoint URL is reachable (use `ngrok`/Vercel preview URLs
  for local testing, not `localhost`).
- **RLS "permission denied" errors during development** — almost always means the request-scoped
  Supabase client (`lib/supabase/server.ts`) wasn't used, or the Clerk↔Supabase third-party auth
  integration isn't configured for your project yet (step 3 under Supabase setup above).
- **Push notifications never arrive** — check `isFirebaseMessagingConfigured` (client) and
  `isFirebaseAdminConfigured` (server) aren't silently `false` due to a missing env var; check
  `notifications.delivery_status` in Supabase for `skipped`/`failed` and the reason.
- **Rate-limit table growth** — `rate_limit_records` grows with usage; call
  `select public.prune_rate_limit_records();` periodically (e.g. a scheduled Supabase cron job)
  to clear windows older than a day.
#   k i n g s - k i d s - c o u n c i l  
 #   k i n g s - k i d s - c o u n c i l  
 