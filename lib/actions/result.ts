import "server-only";
import { ZodError } from "zod";
import { AuthorizationError } from "@/lib/auth/require";

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/**
 * Wraps a Server Action body with consistent error handling: Zod validation
 * failures and AuthorizationError become friendly typed results, anything
 * else is logged server-side and reduced to a generic message (never leak
 * database errors/stack traces to the client).
 *
 * IMPORTANT: only call `assert*` auth helpers (lib/auth/require.ts) inside
 * `fn`, never the redirect-based `require*` ones — `redirect()` throws a
 * special Next.js control-flow error that must propagate, not be caught and
 * flattened into `{ success: false }` here.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, error: error.message };
    }
    if (error instanceof ZodError) {
      return {
        success: false,
        error: "Please check the form for errors.",
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    console.error("Server action failed:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
