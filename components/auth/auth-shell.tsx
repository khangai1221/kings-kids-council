import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Vote, Lightbulb, Megaphone } from "lucide-react";
import { getSiteSettings } from "@/lib/settings/service";

const HIGHLIGHTS = [
  { icon: Vote, label: "Apply for council & vote in elections" },
  { icon: CalendarDays, label: "Register for events and competitions" },
  { icon: Lightbulb, label: "Send suggestions — signed or anonymous" },
  { icon: Megaphone, label: "Get council news and reminders" },
] as const;

interface AuthShellProps {
  /** Action heading on the form side, e.g. "Create your account" / "Sign in". */
  title: string;
  /** Short line under the title, e.g. the email-domain hint. */
  hint: ReactNode;
  /** The Clerk <SignIn /> or <SignUp /> element. */
  children: ReactNode;
}

/**
 * Branded two-pane wrapper shared by the sign-in and sign-up pages. On large
 * screens the left pane carries the crest, portal name and a short "what you
 * can do here" list; the right pane holds the auth form. Below `lg` it
 * collapses to a single centered column with a compact brand header.
 */
export async function AuthShell({ title, hint, children }: AuthShellProps) {
  const settings = await getSiteSettings();
  const logoSrc = settings.portal_logo_url || "/icons/icon.svg";

  return (
    <main id="main-content" className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand pane — desktop only */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(60% 55% at 12% 12%, rgba(255,255,255,0.20), transparent 70%), radial-gradient(55% 55% at 92% 95%, rgba(242,184,75,0.30), transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <Image src={logoSrc} alt="" width={44} height={44} className="rounded-lg bg-white/10 p-1" />
          <span className="text-lg font-semibold tracking-tight">{settings.portal_name}</span>
        </div>

        <div className="relative max-w-sm space-y-7">
          <h2 className="text-[2rem] font-semibold leading-[1.15] tracking-tight">
            The student council, all in one place.
          </h2>
          <ul className="space-y-3.5">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-primary-foreground/95">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs font-medium text-primary-foreground/80">{settings.school_name}</p>
      </aside>

      {/* Form pane */}
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-[400px]">
          <div className="mb-5 flex items-center gap-2.5 lg:hidden">
            <Image src={logoSrc} alt="" width={32} height={32} className="rounded-lg" />
            <span className="text-sm font-semibold text-muted-foreground">{settings.portal_name}</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 mb-6 text-sm text-muted-foreground">{hint}</p>

          {children}

          <p className="mt-8 text-xs text-muted-foreground">
            By continuing you agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              privacy notice
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * Shared Clerk `appearance`. Colours are wired to the app's own CSS custom
 * properties so the embedded widget follows light/dark mode and the
 * admin-configured brand colour; the Clerk header is hidden because the shell
 * supplies its own title, and the card fills the column as one flat panel.
 */
export function authAppearance(primaryColor: string) {
  return {
    variables: {
      colorPrimary: primaryColor,
      colorBackground: "var(--color-card)",
      colorText: "var(--color-card-foreground)",
      colorTextSecondary: "var(--color-muted-foreground)",
      colorInputBackground: "var(--color-background)",
      colorInputText: "var(--color-foreground)",
      colorNeutral: "var(--color-foreground)",
      borderRadius: "0.6rem",
      fontFamily: "var(--font-inter), system-ui, sans-serif",
    },
    elements: {
      rootBox: "w-full",
      cardBox: "w-full rounded-xl border border-border shadow-sm",
      card: "w-full bg-card",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      header: "hidden",
      footer: "bg-muted/40",
      footerActionText: "text-muted-foreground",
      footerActionLink: "text-primary font-medium",
      socialButtonsBlockButton: "border-border",
      formFieldInput: "border-border",
    },
  };
}
