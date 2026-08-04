"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Deferred to a client-only mount flag to avoid a hydration mismatch: `theme` is only known
    // once next-themes reads localStorage/system preference in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="inline-flex rounded-lg border border-border p-1" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          size="sm"
          role="radio"
          aria-checked={mounted && theme === option.value}
          onClick={() => setTheme(option.value)}
          className={cn("gap-1.5", mounted && theme === option.value && "bg-secondary text-secondary-foreground")}
        >
          <option.icon className="size-4" /> {option.label}
        </Button>
      ))}
    </div>
  );
}
