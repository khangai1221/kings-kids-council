"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ICONS, type NavItem } from "@/lib/nav-config";

interface SidebarNavProps {
  items: NavItem[];
  collapsed?: boolean;
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items, collapsed }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1 px-2 py-4">
      {items.map((item, index) => {
        const active = isActive(pathname, item.href);
        const Icon = NAV_ICONS[item.icon];
        const showSectionHeader = item.section && item.section !== items[index - 1]?.section;
        return (
          <div key={item.href}>
            {showSectionHeader ? (
              <div
                className={cn(
                  "px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 first:pt-1",
                  collapsed && "sr-only",
                )}
              >
                {item.section}
              </div>
            ) : null}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-secondary hover:text-secondary-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className={cn(collapsed && "sr-only")}>{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
