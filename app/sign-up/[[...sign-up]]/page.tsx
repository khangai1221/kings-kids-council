import { SignUp } from "@clerk/nextjs";
import { getSiteSettings } from "@/lib/settings/service";

export const metadata = { title: "Sign up" };

export default async function SignUpPage() {
  const settings = await getSiteSettings();

  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">{settings.portal_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an account with your @{settings.allowed_email_domain} school email.
        </p>
      </div>
      <SignUp
        appearance={{
          variables: { colorPrimary: settings.primary_color },
        }}
      />
    </main>
  );
}
