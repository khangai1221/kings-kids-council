/**
 * Shared Clerk `appearance` for the sign-in / sign-up widgets. Pure — safe to
 * import from both the server AuthShell and the client SignUpRolePicker.
 * Colours are wired to the app's own CSS custom properties so the widget
 * follows light/dark mode and the admin-configured brand colour; the Clerk
 * header is hidden because the shell supplies its own title.
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
