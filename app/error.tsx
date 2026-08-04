"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <ErrorState
            title="Something went wrong"
            description="An unexpected error occurred. Please try again — if this keeps happening, contact your administrator."
            onRetry={reset}
          />
        </div>
      </body>
    </html>
  );
}
