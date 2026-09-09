import { SignIn } from "@clerk/nextjs";
import { AuthShell, authAppearance } from "@/components/auth/auth-shell";
import { getSiteSettings } from "@/lib/settings/service";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const settings = await getSiteSettings();

  return (
    <AuthShell
      title="Welcome back"
      hint={
        <>
          Sign in with your{" "}
          <strong className="font-medium text-foreground">@{settings.allowed_email_domain}</strong> school
          account.
        </>
      }
    >
      <SignIn appearance={authAppearance(settings.primary_color)} />
    </AuthShell>
  );
}
