import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTranslations } from "next-intl";

import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { useSidebarInsights } from "./sidebar-insights-context";
import { getBestMatchLength, isLeafActive, isSubItemActiveFor } from "@/navigation/sidebar/nav-match";
import type {
  NavBadge,
  NavGroup,
  NavMainItem,
  NavMainLinkItem,
  NavMainParentItem,
  NavSubItem,
} from "@/navigation/sidebar/sidebar-items";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}
interface NavItemProps {
  readonly item: NavMainItem;
  readonly isItemActive: (item: NavMainItem) => boolean;
  readonly isSubItemActive: (subItem: NavSubItem) => boolean;
  readonly isSubmenuOpen: (item: NavMainParentItem) => boolean;
}

interface NavLinkItemProps {
  readonly item: NavMainLinkItem;
  readonly isActive: boolean;
  readonly showIconFallback: boolean;
}

interface NavLinkIconProps {
  readonly item: NavMainLinkItem;
  readonly showFallback: boolean;
}

interface NavDropdownItemProps {
  readonly item: NavMainParentItem;
  readonly isActive: boolean;
  readonly isSubItemActive: (subItem: NavSubItem) => boolean;
}

interface NavCollapsibleItemProps {
  readonly item: NavMainParentItem;
  readonly isActive: boolean;
  readonly defaultOpen: boolean;
  readonly isSubItemActive: (subItem: NavSubItem) => boolean;
}

function CollapsedIconFallback({ title }: { title: string }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-xs font-medium text-[11px] outline">
      {title.slice(0, 1)}
    </span>
  );
}

function hasSubItems(item: NavMainItem): item is NavMainParentItem {
  return Boolean(item.subItems?.length);
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

function useHydratedCollapsibleOpen(shouldBeOpen: boolean) {
  // usePathname() yields the same value on the server and on the first client
  // render, so seeding from it causes no hydration mismatch and avoids the
  // closed -> open layout shift. The effect keeps it in sync on navigation.
  const [open, setOpen] = useState(shouldBeOpen);

  useEffect(() => {
    setOpen(shouldBeOpen);
  }, [shouldBeOpen]);

  return [open, setOpen] as const;
}

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();

  const bestLength = getBestMatchLength(path, items);

  const isItemActive = (item: NavMainItem) => {
    if (hasSubItems(item)) {
      return item.subItems.some((sub) => isSubItemActiveFor(path, sub, bestLength));
    }

    return isLeafActive(path, item, bestLength);
  };

  const isSubItemActive = (subItem: NavSubItem) => isSubItemActiveFor(path, subItem, bestLength);

  const isSubmenuOpen = (item: NavMainParentItem) => {
    return item.subItems.some((sub) => isSubItemActiveFor(path, sub, bestLength));
  };

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && (
            <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isItemActive={isItemActive}
                  isSubItemActive={isSubItemActive}
                  isSubmenuOpen={isSubmenuOpen}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function NavItem({ item, isItemActive, isSubItemActive, isSubmenuOpen }: NavItemProps) {
  const { state, isMobile } = useSidebar();
  const hydrated = useHydrated();
  const isCollapsedDesktop = hydrated && state === "collapsed" && !isMobile;

  if (!hasSubItems(item)) {
    return <NavLinkItem item={item} isActive={isItemActive(item)} showIconFallback={isCollapsedDesktop} />;
  }

  if (isCollapsedDesktop) {
    return <NavDropdownItem item={item} isActive={isItemActive(item)} isSubItemActive={isSubItemActive} />;
  }

  return (
    <NavCollapsibleItem
      item={item}
      isActive={isItemActive(item)}
      defaultOpen={isSubmenuOpen(item)}
      isSubItemActive={isSubItemActive}
    />
  );
}

function NavLinkItem({ item, isActive, showIconFallback }: NavLinkItemProps) {
  const { counts } = useSidebarInsights();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild aria-disabled={item.disabled} tooltip={item.title} isActive={isActive}>
        <Link
          prefetch={false}
          href={item.url}
          target={item.newTab ? "_blank" : undefined}
          rel={item.newTab ? "noreferrer" : undefined}
        >
          <NavLinkIcon item={item} showFallback={showIconFallback} />
          <span>{item.title}</span>
          <QueueCount count={counts[item.id] ?? 0} className="ml-auto" />
        </Link>
      </SidebarMenuButton>
      <NavItemBadge badge={item.badge} />
    </SidebarMenuItem>
  );
}

function NavLinkIcon({ item, showFallback }: NavLinkIconProps) {
  const Icon = item.icon;

  if (Icon) {
    return <Icon />;
  }

  if (showFallback) {
    return <CollapsedIconFallback title={item.title} />;
  }

  return null;
}

function NavDropdownItem({ item, isActive, isSubItemActive }: NavDropdownItemProps) {
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={isActive} disabled={item.disabled}>
            {Icon ? <Icon /> : <CollapsedIconFallback title={item.title} />}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-56">
          <DropdownMenuGroup>
            {item.subItems.flatMap((subItem) => renderDropdownSubItems(subItem, isSubItemActive))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function NavCollapsibleItem({ item, isActive, defaultOpen, isSubItemActive }: NavCollapsibleItemProps) {
  const Icon = item.icon;
  const { counts } = useSidebarInsights();
  const groupCount = sumSubItemCounts(item.subItems, counts);
  const [open, setOpen] = useHydratedCollapsibleOpen(defaultOpen);

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={isActive} disabled={item.disabled}>
            {Icon && <Icon />}
            <span>{item.title}</span>
            <QueueCount
              count={groupCount}
              className="ml-auto"
              hideClassName="group-data-[state=open]/collapsible:hidden"
            />
            <ChevronRight className={cn(groupCount > 0 ? "group-data-[state=open]/collapsible:ml-auto" : "ml-auto", "transition-transform duration-100 ease-[var(--ease-out-expo)] motion-reduce:transition-none group-data-[state=open]/collapsible:rotate-90")} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <NavItemBadge badge={item.badge} />

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems.map((subItem) => (
              <NavSubItemEntry
                key={subItem.id}
                subItem={subItem}
                isSubItemActive={isSubItemActive}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function renderDropdownSubItems(
  subItem: NavSubItem,
  isSubItemActive: (subItem: NavSubItem) => boolean,
): ReactNode[] {
  if (subItem.subItems?.length) {
    return subItem.subItems.flatMap((child) =>
      renderDropdownSubItems(child, isSubItemActive),
    );
  }

  if (!subItem.url) return [];

  const SubIcon = subItem.icon;

  return [
    <DropdownMenuItem key={subItem.id} asChild disabled={subItem.disabled}>
      <Link
        prefetch={false}
        href={subItem.url}
        target={subItem.newTab ? "_blank" : undefined}
        rel={subItem.newTab ? "noreferrer" : undefined}
        aria-current={isSubItemActive(subItem) ? "page" : undefined}
        className="flex items-center gap-2"
      >
        {SubIcon && <SubIcon />}
        <span>{subItem.title}</span>
      </Link>
    </DropdownMenuItem>,
  ];
}

function NavNestedSubItemEntry({
  subItem,
  isSubItemActive,
}: {
  subItem: NavSubItem;
  isSubItemActive: (subItem: NavSubItem) => boolean;
}) {
  const SubIcon = subItem.icon;
  const isGroupActive = isSubItemActive(subItem);
  const [open, setOpen] = useHydratedCollapsibleOpen(isGroupActive);

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen} className="group/nested">
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton isActive={isGroupActive}>
            {SubIcon && <SubIcon />}
            <span>{subItem.title}</span>
            <ChevronRight className="ml-auto size-3.5 shrink-0 transition-transform duration-100 motion-reduce:transition-none group-data-[state=open]/nested:rotate-90" />
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-3 border-l border-border/60 pl-2">
            {subItem.subItems!.map((child) => (
              <NavSubItemEntry
                key={child.id}
                subItem={child}
                isSubItemActive={isSubItemActive}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  );
}

function NavSubItemEntry({
  subItem,
  isSubItemActive,
}: {
  subItem: NavSubItem;
  isSubItemActive: (subItem: NavSubItem) => boolean;
}) {
  const SubIcon = subItem.icon;
  const { counts } = useSidebarInsights();

  if (subItem.subItems?.length) {
    return (
      <NavNestedSubItemEntry subItem={subItem} isSubItemActive={isSubItemActive} />
    );
  }

  if (!subItem.url) return null;

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        aria-disabled={subItem.disabled}
        isActive={isSubItemActive(subItem)}
      >
        <Link
          prefetch={false}
          href={subItem.url}
          target={subItem.newTab ? "_blank" : undefined}
          rel={subItem.newTab ? "noreferrer" : undefined}
        >
          {SubIcon && <SubIcon />}
          <span>{subItem.title}</span>
          <QueueCount count={counts[subItem.id] ?? 0} className="ml-auto" />
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function sumSubItemCounts(
  subItems: readonly NavSubItem[],
  counts: Readonly<Record<string, number>>,
): number {
  return subItems.reduce(
    (total, sub) =>
      total + (sub.subItems?.length ? sumSubItemCounts(sub.subItems, counts) : (counts[sub.id] ?? 0)),
    0,
  );
}

/** Pending-work pill for action queues. Neutral: it counts work, it does not judge it. */
function QueueCount({
  count,
  className,
  hideClassName,
}: {
  count: number;
  className?: string;
  hideClassName?: string;
}) {
  const t = useTranslations("nav.a11y");

  if (count <= 0) return null;

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-foreground tabular-nums group-data-[collapsible=icon]:hidden",
          className,
          hideClassName,
        )}
      >
        {count}
      </span>
      <span className={cn("sr-only", hideClassName)}>{t("pendingCount", { count })}</span>
    </>
  );
}

function NavItemBadge({ badge }: { badge?: NavBadge }) {
  const t = useTranslations("nav.a11y");

  if (!badge) {
    return null;
  }

  return (
    <SidebarMenuBadge className="rounded-sm border border-muted-foreground text-muted-foreground">
      {badge === "new" ? t("badgeNew") : t("badgeSoon")}
    </SidebarMenuBadge>
  );
}
