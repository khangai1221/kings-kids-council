import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DynamicThemeStyle } from "@/components/layout/dynamic-theme-style";
import { ServiceWorkerRegistration } from "@/components/layout/service-worker-registration";
import { getSiteSettings } from "@/lib/settings/service";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: {
      default: settings.portal_name,
      template: `%s · ${settings.portal_name}`,
    },
    description: `${settings.portal_name} — the private student council portal for ${settings.school_name}.`,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: settings.portal_name,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings();
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: settings.primary_color },
      { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
    ],
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable} h-full`}>
      {/* suppressHydrationWarning: browser extensions (password managers,
          Grammarly, etc.) inject attributes onto <body> before React
          hydrates, which otherwise logs a hydration-mismatch warning. */}
      <body suppressHydrationWarning className="flex min-h-full flex-col antialiased">
        <ClerkProvider afterSignOutUrl="/sign-in">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TooltipProvider delayDuration={200}>
              <DynamicThemeStyle />
              <ServiceWorkerRegistration />
              <a href="#main-content" className="skip-to-content">
                Skip to content
              </a>
              {children}
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
