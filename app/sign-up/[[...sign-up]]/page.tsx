import { AuthShell } from "@/components/auth/auth-shell";
import { getSiteSettings } from "@/lib/settings/service";
import { SignUpRolePicker } from "@/app/sign-up/[[...sign-up]]/sign-up-role-picker";

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
      <SignUpRolePicker primaryColor={settings.primary_color} />
    </AuthShell>
  );
}
