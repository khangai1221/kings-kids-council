"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ICONS, type NavItem } from "@/lib/nav-config";

interface MobileBottomNavProps {
  items: NavItem[];
  onMoreClick: () => void;
  onQuickActionsClick: () => void;
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

/**
 * Renders up to 2 items, a raised center "+" quick-actions button, then any
 * remaining items, then a trailing "Menu" trigger. Expects `items` to have 2
 * entries before the center button and however many after (currently 1).
 */
export function MobileBottomNav({ items, onMoreClick, onQuickActionsClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const before = items.slice(0, 2);
  const after = items.slice(2);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {before.map((item) => (
        <NavTab key={item.href} item={item} active={isActive(item.href)} />
      ))}

      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onQuickActionsClick}
          aria-label="Quick actions"
          className="flex size-12 -translate-y-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card transition-transform active:scale-95"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      </div>

      {after.map((item) => (
        <NavTab key={item.href} item={item} active={isActive(item.href)} />
      ))}

      <button
        type="button"
        onClick={onMoreClick}
        className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
      >
        <Menu className="size-5" aria-hidden="true" />
        Menu
      </button>
    </nav>
  );
}
