import { RichText } from "@/components/shared/rich-text";
import { getSiteSettings } from "@/lib/settings/service";

export const metadata = { title: "Terms" };

export default async function TermsPage() {
  const settings = await getSiteSettings();

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Portal rules</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Terms of use for {settings.portal_name} at {settings.school_name}.
      </p>

      {settings.terms_content ? (
        <div className="mt-8">
          <RichText content={settings.terms_content} />
        </div>
      ) : (
        <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
          <h2>Eligibility</h2>
          <p>
            This portal is available only to current {settings.school_name} students with a verified @
            {settings.allowed_email_domain} school email address.
          </p>

          <h2>Expected conduct</h2>
          <ul>
            <li>Use your own account — do not share your login or act on behalf of another student.</li>
            <li>Submit accurate information in applications, surveys, and suggestions.</li>
            <li>Do not attempt to access another student&rsquo;s private submissions, reviews, or ballots.</li>
            <li>Do not submit abusive, harassing, or spam content through suggestions or applications.</li>
          </ul>

          <h2>Elections and applications</h2>
          <p>
            Each student may cast one ballot per election position and, unless a campaign explicitly
            allows re-applying, one active application per position. Attempting to circumvent these limits
            (for example, by submitting duplicate requests) will not create additional votes or
            applications — these limits are enforced by the database, not only the interface.
          </p>

          <h2>Suggestions</h2>
          <p>
            The suggestion form is not an emergency communication channel. For urgent concerns, please
            contact a trusted school staff member directly.
          </p>

          <h2>Enforcement</h2>
          <p>
            Administrators and teacher advisors may suspend portal access for accounts that violate these
            rules. Suspending access deactivates a profile rather than deleting historical records.
          </p>

          <h2>Changes</h2>
          <p>Administrators may update these terms from the admin Settings page as school policy evolves.</p>
        </div>
      )}
    </main>
  );
}
