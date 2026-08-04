"use client";

import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_ICONS, type NavItem } from "@/lib/nav-config";

interface CommandMenuProps {
  items: NavItem[];
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ items, label, open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={label} description={`Search ${label.toLowerCase()}`}>
      <CommandInput placeholder={`Jump to a ${label.toLowerCase()} page…`} />
      <CommandList>
        <CommandEmpty>No matching pages.</CommandEmpty>
        <CommandGroup heading={label}>
          {items.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            return (
              <CommandItem
                key={item.href}
                value={item.label}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(item.href);
                }}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
