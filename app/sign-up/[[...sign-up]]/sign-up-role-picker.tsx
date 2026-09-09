"use client";

import { useState } from "react";
import { SignUp } from "@clerk/nextjs";
import { GraduationCap, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { authAppearance } from "@/components/auth/auth-appearance";

type Kind = "student" | "staff";

const OPTIONS: { kind: Kind; label: string; icon: typeof GraduationCap }[] = [
  { kind: "student", label: "Student", icon: GraduationCap },
  { kind: "staff", label: "Teacher / staff", icon: Briefcase },
];

/**
 * Sign-up with a Student vs. Teacher/staff choice. The choice is written to
 * the new Clerk user's `unsafeMetadata.staffAccessRequested`; the profile
 * sync copies it to `profiles.staff_access_requested_at`. It grants **no**
 * access on its own — a staff sign-up still lands as a plain student until an
 * admin assigns a role in /admin/users.
 */
export function SignUpRolePicker({ primaryColor }: { primaryColor: string }) {
  const [kind, setKind] = useState<Kind>("student");

  return (
    <div className="w-full space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">I am a…</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {OPTIONS.map(({ kind: k, label, icon: Icon }) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                kind === k
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary/60",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        {kind === "staff" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Staff accounts are reviewed by an administrator before any extra access is granted.
          </p>
        ) : null}
      </div>

      <SignUp
        // Re-mounts the widget when the choice changes so the metadata is applied
        // to the sign-up attempt it creates.
        key={kind}
        unsafeMetadata={kind === "staff" ? { staffAccessRequested: true } : {}}
        appearance={authAppearance(primaryColor)}
      />
    </div>
  );
}
