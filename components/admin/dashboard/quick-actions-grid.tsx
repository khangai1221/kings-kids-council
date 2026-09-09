import Link from "next/link";
import { NAV_ICONS, ADMIN_QUICK_ACTIONS, type NavItem } from "@/lib/nav-config";

export function QuickActionsGrid({ actions = ADMIN_QUICK_ACTIONS }: { actions?: NavItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {actions.map((action) => {
        const Icon = NAV_ICONS[action.icon];
        return (
          <Link
            key={action.href}
            href={action.href}
            className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary/30 hover:bg-secondary/50"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium leading-tight text-foreground">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
