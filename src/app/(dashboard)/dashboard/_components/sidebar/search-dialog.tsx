"use client";

import * as React from "react";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Bell, Building2, CalendarPlus, Clock, Search, UserPlus } from "lucide-react";

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
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { usePermissions } from "@/lib/auth/use-permissions";
import { OPEN_SEARCH_EVENT } from "@/lib/search/open-search";
import { pushRecentPage, readRecentPages, type RecentPage } from "@/lib/search/recent-pages";
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

import { useSidebarInsights } from "./sidebar-insights-context";

type SearchItem = {
  id: string;
  group: string;
  label: string;
  url: string;
  icon?: NavMainItem["icon"];
  disabled?: boolean;
  newTab?: boolean;
  count?: number;
};

function getSubItemGroup(
  groupLabel: string | undefined,
  itemTitle: string,
  groupLabels: Set<string>,
  fallbackGroup: string,
) {
  return groupLabels.has(itemTitle) ? (groupLabel ?? fallbackGroup) : itemTitle;
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

function buildSearchItems(groups: NavGroup[], fallbackGroup: string): SearchItem[] {
  const groupLabels = new Set(groups.flatMap((group) => (group.label ? [group.label] : [])));

  return groups.flatMap((group) =>
    group.items.flatMap((item) => {
      if (item.subItems) {
        return flattenSubItems(
          item.subItems,
          getSubItemGroup(group.label, item.title, groupLabels, fallbackGroup),
          item.icon,
        );
      }
      if (!item.url) return [];

      return [
        {
          id: item.id,
          group: group.label ?? fallbackGroup,
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
    (item) => item.url && !item.disabled,
  );
}

function groupBy(items: SearchItem[]) {
  const groups = [...new Set(items.map((item) => item.group))];
  return groups.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  }));
}

const QUICK_ACTIONS = [
  { id: "action-new-club", labelKey: "newClub", url: "/dashboard/clubs/new", icon: Building2 },
  { id: "action-new-user", labelKey: "newUser", url: "/dashboard/users/new", icon: UserPlus },
  {
    id: "action-new-notification",
    labelKey: "newNotification",
    url: "/dashboard/notifications/new",
    icon: Bell,
  },
  {
    id: "action-new-activity",
    labelKey: "newActivity",
    url: "/dashboard/clubs/activities/new",
    icon: CalendarPlus,
  },
] as const;

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [recents, setRecents] = React.useState<RecentPage[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const sidebarItems = useSidebarItems();
  const t = useTranslations("nav.commandPalette");
  const tShell = useTranslations("shared.shell.search");
  const tNav = useTranslations("nav");
  const { subject } = useScreenAccess();
  const { isPastorOnly } = usePermissions();
  const { user } = useAuth();
  const { counts } = useSidebarInsights();
  const general = tShell("general");

  const sidebarSearchItems = React.useMemo(
    () => getAvailableItems(buildSearchItems(sidebarItems, general)),
    [sidebarItems, general],
  );

  const searchItems = React.useMemo(() => {
    const base = buildSearchItems(sidebarItems, general);
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
  }, [sidebarItems, subject, isPastorOnly, tNav, general]);

  // Every page the user can open right now (sidebar + index pages).
  const accessiblePages = React.useMemo(() => getAvailableItems(searchItems), [searchItems]);

  const actionItems = React.useMemo<SearchItem[]>(
    () =>
      QUICK_ACTIONS.filter((action) => canAccessDashboardPath(user, action.url)).map((action) => ({
        id: action.id,
        group: tShell("actions"),
        label: tShell(action.labelKey),
        url: action.url,
        icon: action.icon,
      })),
    [user, tShell],
  );

  const recentItems = React.useMemo<SearchItem[]>(() => {
    const byUrl = new Map(accessiblePages.map((item) => [item.url, item]));
    return recents.flatMap((recent) => {
      const current = byUrl.get(recent.href);
      return current
        ? [{ ...current, id: `recent-${current.id}`, group: tShell("recent"), icon: current.icon ?? Clock }]
        : [];
    });
  }, [recents, accessiblePages, tShell]);

  const pendingItems = React.useMemo<SearchItem[]>(
    () =>
      sidebarSearchItems.flatMap((item) => {
        const count = counts[item.id] ?? 0;
        return count > 0
          ? [{ ...item, id: `pending-${item.id}`, group: tShell("pending"), count }]
          : [];
      }),
    [sidebarSearchItems, counts, tShell],
  );

  // Record visits to known pages so "Recientes" also covers navigation outside the dialog.
  React.useEffect(() => {
    const page = accessiblePages.find((item) => item.url === pathname && !item.newTab);
    if (page) pushRecentPage({ href: page.url, label: page.label });
  }, [pathname, accessiblePages]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const openFromEvent = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener(OPEN_SEARCH_EVENT, openFromEvent);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener(OPEN_SEARCH_EVENT, openFromEvent);
    };
  }, []);

  React.useEffect(() => {
    if (open) setRecents(readRecentPages());
  }, [open]);

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
      if (!item.id.startsWith("action-")) pushRecentPage({ href: item.url, label: item.label });
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
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {item.icon && <item.icon />}
                <span className="truncate">{item.label}</span>
              </span>
              {item.count ? (
                <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {item.count}
                </span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </React.Fragment>
    ));

  // With no recents and nothing pending, the empty view falls back to the menu pages so it is never bare.
  const visibleItems = query
    ? [...searchItems, ...actionItems]
    : recentItems.length + pendingItems.length > 0
      ? [...recentItems, ...pendingItems, ...actionItems]
      : [...actionItems, ...sidebarSearchItems];

  return (
    <>
      <Button
        onClick={() => handleOpenChange(true)}
        variant="link"
        aria-label={t("searchAriaLabel", { shortcut: "⌘J" })}
        className="px-0! font-normal text-muted-foreground hover:no-underline"
      >
        <Search data-icon="inline-start" />
        {tShell("trigger")}
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
              placeholder={tShell("placeholder")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>{tShell("empty")}</CommandEmpty>
              {renderGroups(visibleItems)}
            </CommandList>
            <div className="flex items-center gap-4 border-t px-3 py-2 text-xs text-muted-foreground">
              <span>{tShell("hintMove")}</span>
              <span>{tShell("hintOpen")}</span>
              <span>{tShell("hintClose")}</span>
            </div>
          </Command>
        ) : null}
      </CommandDialog>
    </>
  );
}
