import Link from "next/link";
import { NAV_ICONS, type NavIconName } from "@/lib/nav-config";

interface QuickAccessTile {
  label: string;
  href: string;
  icon: NavIconName;
}

/**
 * Mirrors the mockup's "Quick Access" tile grid. Labels intentionally
 * differ from the sidebar nav's labels where the mockup uses shorter/
 * different wording for the same destination.
 */
export const QUICK_ACCESS_TILES: QuickAccessTile[] = [
  { label: "Polls", href: "/polls", icon: "CheckSquare" },
  { label: "Apply for Council", href: "/applications", icon: "FileText" },
  { label: "Competitions", href: "/competitions", icon: "Trophy" },
  { label: "Calendar", href: "/events", icon: "CalendarDays" },
  { label: "Research", href: "/surveys", icon: "ClipboardList" },
  { label: "Suggestions", href: "/suggestions", icon: "Lightbulb" },
  { label: "Updates", href: "/announcements", icon: "Megaphone" },
  { label: "Profile", href: "/profile", icon: "UserCircle" },
];

export function QuickAccessGrid({ tiles = QUICK_ACCESS_TILES }: { tiles?: QuickAccessTile[] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {tiles.map((tile) => {
        const Icon = NAV_ICONS[tile.icon];
        return (
          <Link
            key={tile.href}
            href={tile.href}
            className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/30 hover:bg-secondary/50"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium leading-tight text-foreground">{tile.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
