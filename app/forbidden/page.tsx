import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Forbidden" };

export default function ForbiddenPage() {
  return (
    <main id="main-content" className="flex flex-1 items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-warning/10">
          <Lock className="size-6 text-warning" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">You don&apos;t have permission to view this page</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You&apos;re signed in, but your account doesn&apos;t have access to this section of the portal. If you
          believe this is a mistake, contact a council administrator.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
