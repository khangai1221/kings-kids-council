"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EventCategoryRow } from "@/types/database";

export function EventFilters({ categories, activeCategory }: { categories: EventCategoryRow[]; activeCategory?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setCategory(categoryId?: string) {
    const params = new URLSearchParams(searchParams);
    if (categoryId) params.set("category", categoryId);
    else params.delete("category");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Button size="sm" variant={!activeCategory ? "default" : "outline"} onClick={() => setCategory(undefined)}>All</Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          size="sm"
          variant={activeCategory === category.id ? "default" : "outline"}
          className={cn(activeCategory === category.id && "pointer-events-none")}
          onClick={() => setCategory(category.id)}
        >
          {category.label}
        </Button>
      ))}
    </div>
  );
}
