import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusConfig, type StatusTone } from "@/lib/status-config";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-info/10 text-info border-transparent dark:text-info",
  success: "bg-success/10 text-success border-transparent dark:text-success",
  warning: "bg-warning/10 text-warning border-transparent dark:text-warning",
  error: "bg-destructive/10 text-destructive border-transparent",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = getStatusConfig(status);
  return (
    <Badge variant="outline" className={cn("capitalize", TONE_CLASSES[config.tone], className)}>
      {config.label}
    </Badge>
  );
}
