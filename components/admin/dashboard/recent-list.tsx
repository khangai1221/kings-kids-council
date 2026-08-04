import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export interface RecentListItem {
  id: string;
  title: string;
  status: string;
  href?: string;
  meta?: string;
}

export function RecentList({ items, emptyLabel }: { items: RecentListItem[]; emptyLabel: string }) {
  if (items.length === 0) return <EmptyState title={emptyLabel} />;

  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {items.map((item) => {
          const row = (
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{item.title}</p>
                {item.meta ? <p className="text-xs text-muted-foreground">{item.meta}</p> : null}
              </div>
              <StatusBadge status={item.status} className="shrink-0" />
            </div>
          );
          return item.href ? (
            <Link key={item.id} href={item.href} className="block transition-colors hover:bg-secondary/50">
              {row}
            </Link>
          ) : (
            <div key={item.id}>{row}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}
