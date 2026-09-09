import { SignUp } from "@clerk/nextjs";
import { AuthShell, authAppearance } from "@/components/auth/auth-shell";
import { getSiteSettings } from "@/lib/settings/service";

export const metadata = { title: "Create your account" };

export default async function SignUpPage() {
  const settings = await getSiteSettings();

  return (
    <AuthShell
      title="Create your account"
      hint={
        <>
          Use your <strong className="font-medium text-foreground">@{settings.allowed_email_domain}</strong>{" "}
          school email.
        </>
      }
    >
      <SignUp appearance={authAppearance(settings.primary_color)} />
    </AuthShell>
  );
}
