"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ROLES, ROLE_LABELS } from "@/lib/permissions/roles";
import { ACCOUNT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function UserFilters({
  search,
  role,
  status,
  staffRequests,
  staffRequestCount = 0,
}: {
  search?: string;
  role?: string;
  status?: string;
  staffRequests?: boolean;
  staffRequestCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (query) params.set("q", query);
      else params.delete("q");
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(timeout);
    // Only re-debounce on query changes; router/pathname/searchParams are read at fire time, not tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Input placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
      <Select value={role ?? "all"} onValueChange={(v) => setParam("role", v === "all" ? "" : v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={status ?? "all"} onValueChange={(v) => setParam("status", v === "all" ? "" : v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {ACCOUNT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
        </SelectContent>
      </Select>
      {staffRequestCount > 0 || staffRequests ? (
        <Button
          type="button"
          variant={staffRequests ? "default" : "outline"}
          onClick={() => setParam("request", staffRequests ? "" : "staff")}
          className={cn("gap-1.5", !staffRequests && "border-warning/40 text-warning hover:text-warning")}
        >
          Staff requests
          {staffRequestCount > 0 ? (
            <span className="rounded-full bg-warning px-1.5 text-xs font-semibold text-warning-foreground">
              {staffRequestCount}
            </span>
          ) : null}
        </Button>
      ) : null}
    </div>
  );
}
