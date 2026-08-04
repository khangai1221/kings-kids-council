import { RichText } from "@/components/shared/rich-text";
import { getSiteSettings } from "@/lib/settings/service";

export const metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const settings = await getSiteSettings();

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Privacy notice</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        How {settings.portal_name} collects, uses, and protects student data.
      </p>

      {settings.privacy_notice ? (
        <div className="mt-8">
          <RichText content={settings.privacy_notice} />
        </div>
      ) : (
        <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
          <h2>What we collect</h2>
          <p>
            To run council applications, elections, surveys, events, and suggestions, we store your name,
            school email, grade, class, graduation year, and the content you submit through the portal
            (application answers, survey responses, event registrations, suggestions). We apply data
            minimization: we do not collect phone numbers, home addresses, personal social media accounts,
            government identifiers, or other sensitive personal information.
          </p>

          <h2>Who can see your data</h2>
          <p>
            Access is restricted by role and enforced at the database level, not just in the interface.
            Reviewers only see applications assigned to them. Ordinary council members never see the
            identity behind an anonymous-to-council suggestion. Raw election ballots are never directly
            accessible to administrators — only aggregate results and turnout are.
          </p>

          <h2>Data retention</h2>
          <p>
            Administrators configure retention periods for each content type from the admin Settings page.
            When a Clerk account is removed, we deactivate the corresponding profile rather than deleting
            it outright, so that historical student council records (past elections, past council terms)
            remain intact.
          </p>

          <h2>Notifications</h2>
          <p>
            In-app notifications are always available. Browser push notifications are strictly opt-in —
            we only request permission and register a device token after you enable them in Settings, and
            you can disable them at any time. Firebase Cloud Messaging only ever receives a device token
            used for delivery; it never receives your application answers, suggestion content, or survey
            responses.
          </p>

          <h2>Anonymous suggestions</h2>
          <p>
            Choosing &ldquo;Anonymous to council&rdquo; hides your identity from ordinary council members
            and administrators. To be transparent: this is a privacy-preserving convention enforced by
            strict database access controls, not a cryptographically untraceable submission. A teacher
            advisor or Super Admin can reveal the identity behind an anonymous suggestion only when policy
            requires it, and every such access is permanently logged in the audit trail.
          </p>

          <h2>Election privacy</h2>
          <p>
            Student council elections on this portal are a privacy-preserving school election system, not
            a cryptographically anonymous national election platform. We separate the record that proves
            you voted from the ballot recording your choices — the ballot itself never stores who cast it —
            and enforce this separation at the database level so that even administrators cannot query raw
            ballot rows directly; only aggregate results and turnout are exposed.
          </p>

          <h2>Questions</h2>
          <p>
            Contact{" "}
            {settings.contact_email ? (
              <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
            ) : (
              "your school administrator"
            )}{" "}
            with any privacy questions. For urgent personal concerns, please speak with a trusted school
            staff member directly — this portal is not an emergency communication channel.
          </p>
        </div>
      )}
    </main>
  );
}
