"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { navConfig, type NavItem, type NavChild } from "@/components/layout/nav-config";
import { usePermissions } from "@/lib/auth/use-permissions";

type SearchableEntry = {
  groupLabel: string;
  parentTitle?: string;
  title: string;
  url: string;
  icon?: NavItem["icon"];
  keywords: string[];
};

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalCommandPalette({ open, onOpenChange }: GlobalCommandPaletteProps) {
  const router = useRouter();
  const t = useTranslations("nav");
  const tCmd = useTranslations("nav.commandPalette");
  const { can, isSuperAdmin } = usePermissions();

  const entries = useMemo<SearchableEntry[]>(() => {
    const flat: SearchableEntry[] = [];

    const check = (perm?: string) => !perm || isSuperAdmin || can(perm);

    for (const group of navConfig) {
      const groupLabel = group.label ? t(group.label as Parameters<typeof t>[0]) : tCmd("general");

      for (const item of group.items) {
        if (!check(item.permission)) continue;

        const parentTitle = t(item.title as Parameters<typeof t>[0]);
        const hasChildren = item.children && item.children.length > 0;

        if (!hasChildren) {
          flat.push({
            groupLabel,
            title: parentTitle,
            url: item.url,
            icon: item.icon,
            keywords: [parentTitle, groupLabel, item.url],
          });
        }

        if (hasChildren) {
          flat.push({
            groupLabel,
            title: parentTitle,
            url: item.url,
            icon: item.icon,
            keywords: [parentTitle, groupLabel, item.url],
          });

          for (const child of item.children as NavChild[]) {
            if (!check(child.permission)) continue;
            const childTitle = t(child.title as Parameters<typeof t>[0]);
            flat.push({
              groupLabel,
              parentTitle,
              title: childTitle,
              url: child.url,
              icon: item.icon,
              keywords: [childTitle, parentTitle, groupLabel, child.url],
            });
          }
        }
      }
    }

    return flat;
  }, [t, tCmd, can, isSuperAdmin]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchableEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.groupLabel) ?? [];
      list.push(entry);
      map.set(entry.groupLabel, list);
    }
    return Array.from(map.entries());
  }, [entries]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    router.push(url);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tCmd("title")}
      description={tCmd("description")}
    >
      <CommandInput placeholder={tCmd("placeholder")} />
      <CommandList>
        <CommandEmpty>{tCmd("empty")}</CommandEmpty>
        {grouped.map(([groupLabel, items], idx) => (
          <div key={groupLabel}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={groupLabel}>
              {items.map((entry) => {
                const Icon = entry.icon;
                const display = entry.parentTitle
                  ? `${entry.parentTitle} › ${entry.title}`
                  : entry.title;
                return (
                  <CommandItem
                    key={`${entry.url}-${entry.title}`}
                    value={entry.keywords.join(" ")}
                    onSelect={() => handleSelect(entry.url)}
                  >
                    {Icon && <Icon className="size-4" aria-hidden="true" />}
                    <span>{display}</span>
                    <CommandShortcut className="font-mono">{entry.url}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
