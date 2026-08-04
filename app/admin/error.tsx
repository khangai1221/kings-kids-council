"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-12">
      <ErrorState onRetry={reset} />
    </div>
  );
}
