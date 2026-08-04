import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { UnauthorizedSignOut } from "@/components/auth/unauthorized-sign-out";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/settings/service";

export const metadata = { title: "Unauthorized" };

export default async function UnauthorizedPage() {
  const settings = await getSiteSettings();

  return (
    <main id="main-content" className="flex flex-1 items-center justify-center bg-background p-6">
      <UnauthorizedSignOut />
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Access restricted</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This portal is available only to {settings.school_name} accounts using an @
          {settings.allowed_email_domain} email address.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          If you believe this is a mistake, please contact{" "}
          {settings.contact_email ? (
            <a href={`mailto:${settings.contact_email}`} className="font-medium text-primary underline">
              {settings.contact_email}
            </a>
          ) : (
            "your school administrator"
          )}
          .
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    </main>
  );
}
