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
  navConfig,
  isSubGroup,
  type NavChild,
  type NavGroup,
  type NavItem,
  type NavSubGroup,
} from "@/components/layout/nav-config";
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
          section: item.title,
        });
      }
    }
  }
  return out;
}

export function CommandPalette() {
  const router = useRouter();
  const tNav = useTranslations("nav");
  const t = useTranslations("nav.palette");
  const { can, isSuperAdmin } = usePermissions();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const allEntries = useMemo(() => flatten(navConfig), []);

  const visibleEntries = useMemo(() => {
    if (isSuperAdmin) return allEntries;
    return allEntries.filter((entry) => {
      if (!entry.permission) return true;
      return can(entry.permission);
    });
  }, [allEntries, can, isSuperAdmin]);

  const grouped = useMemo(() => {
    const map = new Map<string, FlatEntry[]>();
    for (const entry of visibleEntries) {
      const key = entry.section ?? "__default__";
      const arr = map.get(key) ?? [];
      arr.push(entry);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [visibleEntries]);

  function handleSelect(url: string) {
    setOpen(false);
    router.push(url);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("title")}
      description={t("description")}
    >
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("empty")}</CommandEmpty>
        {grouped.map(([sectionKey, entries]) => {
          const heading =
            sectionKey === "__default__"
              ? t("generalGroup")
              : tNav(sectionKey as Parameters<typeof tNav>[0]);
          return (
            <CommandGroup key={sectionKey} heading={heading}>
              {entries.map((entry) => {
                const Icon = entry.icon;
                const label = tNav(entry.title as Parameters<typeof tNav>[0]);
                return (
                  <CommandItem
                    key={entry.key}
                    value={`${label} ${heading} ${entry.url}`}
                    onSelect={() => handleSelect(entry.url)}
                  >
                    <Icon className="mr-2 size-4" aria-hidden="true" />
                    <span>{label}</span>
                    <CommandShortcut>{entry.url}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
