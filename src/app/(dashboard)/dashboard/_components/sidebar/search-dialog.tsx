"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { usePermissions } from "@/lib/auth/use-permissions";
import {
  CATALOGS_INDEX_SECTIONS,
  CONFIGURATION_INDEX_SECTIONS,
} from "@/navigation/sidebar/index-pages";
import {
  resolveIndexSections,
  type ResolvedIndexSection,
} from "@/navigation/sidebar/index-pages-resolve";
import type { NavGroup, NavMainItem, NavSubItem } from "@/navigation/sidebar/sidebar-items";
import { useSidebarItems } from "@/navigation/sidebar/use-sidebar-items";

type SearchItem = {
  id: string;
  group: string;
  label: string;
  url: string;
  icon?: NavMainItem["icon"];
  disabled?: boolean;
  newTab?: boolean;
};

function getSubItemGroup(groupLabel: string | undefined, itemTitle: string, groupLabels: Set<string>) {
  return groupLabels.has(itemTitle) ? (groupLabel ?? "Other") : itemTitle;
}

function flattenSubItems(
  subItems: NavSubItem[],
  group: string,
  parentIcon?: NavMainItem["icon"],
  parentLabel?: string,
): SearchItem[] {
  return subItems.flatMap((sub) => {
    if (sub.subItems?.length) {
      return flattenSubItems(
        sub.subItems,
        group,
        sub.icon ?? parentIcon,
        sub.title,
      );
    }

    if (!sub.url) return [];

    return [
      {
        id: sub.id,
        group,
        label: parentLabel ? `${parentLabel} · ${sub.title}` : sub.title,
        url: sub.url,
        icon: sub.icon ?? parentIcon,
        disabled: sub.disabled,
        newTab: sub.newTab,
      },
    ];
  });
}

function buildSearchItems(groups: NavGroup[]): SearchItem[] {
  const groupLabels = new Set(groups.flatMap((group) => (group.label ? [group.label] : [])));

  return groups.flatMap((group) =>
    group.items.flatMap((item) => {
      if (item.subItems) {
        return flattenSubItems(
          item.subItems,
          getSubItemGroup(group.label, item.title, groupLabels),
          item.icon,
        );
      }
      if (!item.url) return [];

      return [
        {
          id: item.id,
          group: group.label ?? "Other",
          label: item.title,
          url: item.url,
          icon: item.icon,
          disabled: item.disabled,
          newTab: item.newTab,
        },
      ];
    }),
  );
}

/**
 * Pages that left the sidebar for an index (catalogs, configuration) stay
 * searchable. Items already reachable from the sidebar tree are skipped.
 */
function buildIndexSearchItems(
  group: string,
  sections: ResolvedIndexSection[],
  seen: ReadonlySet<string>,
): SearchItem[] {
  return sections.flatMap((section) =>
    section.links
      .filter((link) => !seen.has(link.id))
      .map((link) => ({
        id: link.id,
        group,
        label: section.title === link.title ? link.title : `${section.title} · ${link.title}`,
        url: link.url,
        icon: link.icon,
      })),
  );
}

function getAvailableItems(items: SearchItem[]) {
  return items.filter(
    (item) => item.url && !item.disabled && !item.url.includes("coming-soon"),
  );
}

function groupBy(items: SearchItem[]) {
  const groups = [...new Set(items.map((item) => item.group))];
  return groups.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));
}

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const sidebarItems = useSidebarItems();
  const t = useTranslations("nav.commandPalette");
  const tNav = useTranslations("nav");
  const { subject } = useScreenAccess();
  const { isPastorOnly } = usePermissions();

  const searchItems = React.useMemo(() => {
    const base = buildSearchItems(sidebarItems);
    if (isPastorOnly) return base;
    const translator = tNav as unknown as NavTranslator;
    const canOpen = (link: { id: string }) => canViewScreen(subject, link.id);
    const seen = new Set(base.map((item) => item.id));
    return [
      ...base,
      ...buildIndexSearchItems(
        tNav("items.catalogs_root"),
        resolveIndexSections(CATALOGS_INDEX_SECTIONS, canOpen, translator),
        seen,
      ),
      ...buildIndexSearchItems(
        tNav("items.configuration"),
        resolveIndexSections(CONFIGURATION_INDEX_SECTIONS, canOpen, translator),
        seen,
      ),
    ];
  }, [sidebarItems, subject, isPastorOnly, tNav]);
  // Default list (empty query) stays the sidebar; index pages only add search hits.
  const recommendations = React.useMemo(
    () => getAvailableItems(buildSearchItems(sidebarItems)),
    [sidebarItems],
  );

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) setQuery("");
  };

  const handleSelect = (item: SearchItem) => {
    if (item.disabled) return;
    handleOpenChange(false);
    if (item.newTab) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    } else {
      router.push(item.url);
    }
  };

  const renderGroups = (items: SearchItem[]) =>
    groupBy(items).map(({ group, items: groupItems }, index) => (
      <React.Fragment key={group}>
        {index > 0 && <CommandSeparator />}
        <CommandGroup heading={group}>
          {groupItems.map((item) => (
            <CommandItem
              disabled={item.disabled}
              key={`${group}-${item.id}`}
              value={`${item.group} ${item.label}`}
              onSelect={() => handleSelect(item)}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon && <item.icon />}
                <span className="truncate">{item.label}</span>
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </React.Fragment>
    ));

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant="link"
        aria-label={t("searchAriaLabel", { shortcut: "⌘J" })}
        className="px-0! font-normal text-muted-foreground hover:no-underline"
      >
        <Search data-icon="inline-start" />
        {t("triggerLabel")}
        <kbd className="hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-2xs [@media(pointer:fine)]:inline-flex">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={t("title")}
        description={t("description")}
      >
        {open ? (
          <Command>
            <CommandInput
              placeholder={t("placeholder")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>{t("empty")}</CommandEmpty>
              {query ? renderGroups(searchItems) : renderGroups(recommendations)}
            </CommandList>
          </Command>
        ) : null}
      </CommandDialog>
    </>
  );
}
