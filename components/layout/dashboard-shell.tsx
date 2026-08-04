"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { Menu, PanelLeftClose, PanelLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CommandMenu } from "@/components/layout/command-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { NAV_ICONS, type NavItem } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  navItems: NavItem[];
  mobileNavItems?: NavItem[];
  quickActions?: NavItem[];
  portalName: string;
  logoUrl?: string | null;
  homeHref: string;
  badge?: ReactNode;
  userId: string;
  initialUnreadCount: number;
  children: ReactNode;
}

export function DashboardShell({
  navItems,
  mobileNavItems,
  quickActions,
  portalName,
  logoUrl,
  homeHref,
  badge,
  userId,
  initialUnreadCount,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const bottomNavItems = mobileNavItems ?? navItems.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <CommandMenu items={navItems} label={portalName} open={commandOpen} onOpenChange={setCommandOpen} />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 md:flex md:flex-col",
            collapsed ? "md:w-16" : "md:w-64",
          )}
        >
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <Link href={homeHref} className="flex min-w-0 items-center gap-2">
              {logoUrl ? (
                <Image src={logoUrl} alt="" width={28} height={28} className="shrink-0 rounded" />
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {portalName.slice(0, 2).toUpperCase()}
                </span>
              )}
              {!collapsed ? <span className="truncate text-sm font-semibold text-foreground">{portalName}</span> : null}
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav items={navItems} collapsed={collapsed} />
          </div>
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
              {!collapsed ? "Collapse" : null}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <Sheet>
              <Button variant="ghost" size="icon" className="md:hidden" asChild>
                <SheetTrigger aria-label="Open navigation menu">
                  <Menu className="size-5" />
                </SheetTrigger>
              </Button>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border px-4 py-3">
                  <SheetTitle className="text-sm">{portalName}</SheetTitle>
                </SheetHeader>
                <SidebarNav items={navItems} />
              </SheetContent>
            </Sheet>

            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex h-9 flex-1 max-w-sm items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary"
            >
              <Search className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Search…</span>
              <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
                ⌘K
              </kbd>
            </button>

            {badge}

            <div className="ml-auto flex items-center gap-1">
              <NotificationBell userId={userId} initialUnreadCount={initialUnreadCount} />
              <UserButton />
            </div>
          </header>

          <main id="main-content" className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 md:pb-6">
            {children}
          </main>
        </div>
      </div>

      <MobileBottomNav
        items={bottomNavItems}
        onMoreClick={() => setMoreOpen(true)}
        onQuickActionsClick={() => setQuickActionsOpen(true)}
      />
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <SidebarNav items={navItems} />
        </SheetContent>
      </Sheet>
      {quickActions?.length ? (
        <Sheet open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
          <SheetContent side="bottom" className="rounded-t-xl">
            <SheetHeader>
              <SheetTitle>Quick actions</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-2 pb-4">
              {quickActions.map((action) => {
                const Icon = NAV_ICONS[action.icon];
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={() => setQuickActionsOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    <Icon className="size-[18px] shrink-0 text-primary" aria-hidden="true" />
                    {action.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
