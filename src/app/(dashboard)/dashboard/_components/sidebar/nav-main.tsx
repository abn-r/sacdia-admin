import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
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
import {
  defaultGroupOpen,
  groupsAreToggleable,
  readGroupOpenStateCookie,
  serializeGroupOpenStateCookie,
  sumGroupCounts,
  sumSubItemCounts,
  type GroupOpenState,
} from "@/navigation/sidebar/group-state";
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
    <span className="flex size-4 shrink-0 items-center justify-center rounded-xs font-medium text-2xs outline">
      {title.slice(0, 1)}
    </span>
  );
}

function hasSubItems(item: NavMainItem): item is NavMainParentItem {
  return Boolean(item.subItems?.length);
}

const subscribeNever = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
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

// The saved group choice lives in a cookie. useSyncExternalStore serves the
// server snapshot ("" -> defaults) during hydration and the real cookie right
// after, so the first client render matches the server markup.
const cookieListeners = new Set<() => void>();

function subscribeToCookie(listener: () => void) {
  cookieListeners.add(listener);
  return () => {
    cookieListeners.delete(listener);
  };
}

function writeGroupCookie(state: GroupOpenState) {
  document.cookie = serializeGroupOpenStateCookie(state);
  cookieListeners.forEach((listener) => listener());
}

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();
  const { counts } = useSidebarInsights();
  const { state, isMobile } = useSidebar();
  const hydrated = useHydrated();
  const isCollapsedDesktop = hydrated && state === "collapsed" && !isMobile;
  const toggleable = groupsAreToggleable(items);

  // Defaults render first (server and first client pass); the saved choice is
  // read after mount so the markup never mismatches during hydration.
  const cookieString = useSyncExternalStore(
    subscribeToCookie,
    () => document.cookie,
    () => "",
  );
  const stored = useMemo(() => readGroupOpenStateCookie(cookieString), [cookieString]);
  // Closing the group of the current page is allowed until the next navigation.
  const [dismissed, setDismissed] = useState<{ path: string; groupId: number } | null>(null);

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

  const isGroupOpen = (group: NavGroup, isActiveGroup: boolean) => {
    // Unlabelled groups (Inicio) have no toggle, so they are always open.
    if (!toggleable || isCollapsedDesktop || !group.label) return true;
    const dismissedNow = dismissed?.path === path && dismissed.groupId === group.id;
    if (isActiveGroup && !dismissedNow) return true;
    return stored[String(group.id)] ?? defaultGroupOpen(group.id);
  };

  const toggleGroup = useCallback(
    (group: NavGroup, nextOpen: boolean, isActiveGroup: boolean) => {
      const next = { ...stored, [String(group.id)]: nextOpen };
      writeGroupCookie(next);
      if (!nextOpen && isActiveGroup) {
        setDismissed({ path, groupId: group.id });
      } else {
        setDismissed(null);
      }
    },
    [stored, path],
  );

  return (
    <>
      {items.map((group) => {
        const isActiveGroup = group.items.some(isItemActive);
        const open = isGroupOpen(group, isActiveGroup);

        return (
          <NavGroupSection
            key={group.id}
            group={group}
            toggleable={toggleable && !isCollapsedDesktop && Boolean(group.label)}
            open={open}
            pendingCount={sumGroupCounts(group, counts)}
            onToggle={() => toggleGroup(group, !open, isActiveGroup)}
          >
            {group.items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isItemActive={isItemActive}
                isSubItemActive={isSubItemActive}
                isSubmenuOpen={isSubmenuOpen}
              />
            ))}
          </NavGroupSection>
        );
      })}
    </>
  );
}

interface NavGroupSectionProps {
  readonly group: NavGroup;
  readonly toggleable: boolean;
  readonly open: boolean;
  readonly pendingCount: number;
  readonly onToggle: () => void;
  readonly children: ReactNode;
}

function NavGroupSection({
  group,
  toggleable,
  open,
  pendingCount,
  onToggle,
  children,
}: NavGroupSectionProps) {
  const t = useTranslations("shared.shell.sidebar");
  const baseId = useId();
  const contentId = `${baseId}-content`;
  const pendingId = `${baseId}-pending`;
  const showPending = toggleable && !open && pendingCount > 0;

  return (
    <SidebarGroup>
      {group.label &&
        (toggleable ? (
          <SidebarGroupLabel asChild>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={contentId}
              aria-label={t("toggleGroup", { group: group.label })}
              aria-describedby={showPending ? pendingId : undefined}
              onClick={onToggle}
              className="w-full cursor-pointer gap-1 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <ChevronRight
                aria-hidden="true"
                className={cn(
                  "size-3.5 transition-transform duration-100 motion-reduce:transition-none",
                  open && "rotate-90",
                )}
              />
              <span>{group.label}</span>
              {showPending && (
                <>
                  <span
                    aria-hidden="true"
                    className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-foreground tabular-nums"
                  >
                    {pendingCount}
                  </span>
                  <span id={pendingId} className="sr-only">
                    {t("groupPending", { count: pendingCount })}
                  </span>
                </>
              )}
            </button>
          </SidebarGroupLabel>
        ) : (
          <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
            {group.label}
          </SidebarGroupLabel>
        ))}
      <SidebarGroupContent id={contentId} hidden={!open}>
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
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
          "inline-flex h-5 min-w-5 flex-none! items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-foreground tabular-nums group-data-[collapsible=icon]:hidden",
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
