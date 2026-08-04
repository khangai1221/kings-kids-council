import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  /** Plain-language summary so the trend isn't communicated by color alone. */
  helperText?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "success" | "warning" | "error";
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
};

export function StatCard({ label, value, helperText, icon: Icon, tone = "neutral", className }: StatCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums", TONE_CLASSES[tone])}>{value}</p>
          {helperText ? <p className="mt-1 text-xs text-muted-foreground">{helperText}</p> : null}
        </div>
        {Icon ? (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
