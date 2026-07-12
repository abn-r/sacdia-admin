"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  isSubGroup,
  type NavChild,
  type NavGroup,
  type NavItem,
  type NavSubGroup,
} from "@/components/layout/nav-config";
import { buildV2NavConfig } from "@/navigation/v2/nav-config";
import { usePermissions } from "@/lib/auth/use-permissions";
import type { LucideIcon } from "lucide-react";

type FlatEntry = {
  key: string;
  title: string;
  url: string;
  icon: LucideIcon;
  permission?: string;
  section?: string;
};

function flatten(groups: NavGroup[]): FlatEntry[] {
  const out: FlatEntry[] = [];
  for (const group of groups) {
    const sectionKey = group.label;
    for (const item of group.items) {
      out.push({
        key: item.url,
        title: item.title,
        url: item.url,
        icon: item.icon,
        permission: item.permission,
        section: sectionKey,
      });

      if (!item.children) continue;
      const children = item.children;
      const flat: NavChild[] = isSubGroup(children[0]!)
        ? (children as NavSubGroup[]).flatMap((sg) => sg.items)
        : (children as NavChild[]);

      for (const child of flat) {
        out.push({
          key: child.url,
          title: child.title,
          url: child.url,
          icon: item.icon,
          permission: child.permission ?? item.permission,
          section: sectionKey,
        });
      }
    }
  }
  return out;
}

export function StudioSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const t = useTranslations("nav");
  const tPalette = useTranslations("nav.palette");
  const { can, isSuperAdmin } = usePermissions();

  const entries = useMemo(() => {
    const flat = flatten(buildV2NavConfig());
    return flat.filter(
      (entry) =>
        isSuperAdmin || !entry.permission || can(entry.permission),
    );
  }, [can, isSuperAdmin]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const grouped = useMemo(() => {
    const map = new Map<string, FlatEntry[]>();
    for (const entry of entries) {
      const section = entry.section ?? "general";
      const list = map.get(section) ?? [];
      list.push(entry);
      map.set(section, list);
    }
    return map;
  }, [entries]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={tPalette("placeholder")} />
      <CommandList>
        <CommandEmpty>{tPalette("empty")}</CommandEmpty>
        {[...grouped.entries()].map(([section, items]) => (
          <CommandGroup
            key={section}
            heading={
              section === "general"
                ? tPalette("generalGroup")
                : t(section as Parameters<typeof t>[0])
            }
          >
            {items.map((entry) => (
              <CommandItem
                key={entry.key}
                value={`${t(entry.title as Parameters<typeof t>[0])} ${entry.url}`}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(entry.url);
                }}
              >
                <entry.icon className="size-4 shrink-0" />
                <span>{t(entry.title as Parameters<typeof t>[0])}</span>
                <CommandShortcut className="hidden sm:inline">
                  {entry.url.replace("/v2/dashboard", "") || "/"}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
