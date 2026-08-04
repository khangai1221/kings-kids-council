import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface GreetingCardProps {
  firstName: string;
  avatarUrl?: string | null;
  gradeLabel?: string | null;
  classLabel?: string | null;
}

export function GreetingCard({ firstName, avatarUrl, gradeLabel, classLabel }: GreetingCardProps) {
  const subtitle = [gradeLabel, classLabel].filter(Boolean).join(" • ");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{timeOfDayGreeting()},</p>
          <p className="text-xl font-semibold text-foreground sm:text-2xl">{firstName} 👋</p>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={56} height={56} className="size-14 object-cover" />
          ) : (
            <span className="text-lg font-semibold text-secondary-foreground">{firstName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
