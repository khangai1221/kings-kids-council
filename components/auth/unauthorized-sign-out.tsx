"use client";

import { useEffect } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";

/**
 * Unauthorized users must be signed out, not just redirected — otherwise a
 * refresh or back-navigation would land them right back in a protected page
 * for the instant before the server guard re-checks them. This runs once on
 * mount and is a no-op if there is no active session.
 */
export function UnauthorizedSignOut() {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isSignedIn) {
      void signOut({ redirectUrl: "/unauthorized" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  return null;
}
