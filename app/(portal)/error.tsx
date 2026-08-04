"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-12">
      <ErrorState onRetry={reset} />
    </div>
  );
}
