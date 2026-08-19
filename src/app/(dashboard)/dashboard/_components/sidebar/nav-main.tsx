import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

function matchesNavPath(
  path: string,
  url: string,
  activeMatch?: NavSubItem["activeMatch"] | NavMainLinkItem["activeMatch"],
): boolean {
  switch (activeMatch) {
    case "prefix":
      return path === url || path.startsWith(`${url}/`);
    case "clubs-list":
      return (
        path === url ||
        (/^\/dashboard\/clubs\/[^/]+$/.test(path) &&
          !path.startsWith("/dashboard/clubs/validations") &&
          !path.startsWith("/dashboard/clubs/evidence-folders"))
      );
    case "evidence-folders":
      return path === url || path.startsWith(`${url}/`);
    case "exact":
    default:
      return path === url;
  }
}

function matchesSubItem(path: string, subItem: NavSubItem): boolean {
  if (subItem.subItems?.length) {
    return subItem.subItems.some((child) => matchesSubItem(path, child));
  }
  if (!subItem.url) return false;

  return matchesNavPath(path, subItem.url, subItem.activeMatch);
}

function CollapsedIconFallback({ title }: { title: string }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-xs font-medium text-[10px] outline">
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(shouldBeOpen);
  }, [shouldBeOpen]);

  return [open, setOpen] as const;
}

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();

  const isItemActive = (item: NavMainItem) => {
    if (hasSubItems(item)) {
      return item.subItems.some((sub) => matchesSubItem(path, sub));
    }

    if (!item.url) {
      return false;
    }

    return matchesNavPath(path, item.url, item.activeMatch);
  };

  const isSubItemActive = (subItem: NavSubItem) => matchesSubItem(path, subItem);

  const isSubmenuOpen = (item: NavMainParentItem) => {
    return item.subItems.some((sub) => matchesSubItem(path, sub));
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
  const [open, setOpen] = useHydratedCollapsibleOpen(defaultOpen);

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={isActive} disabled={item.disabled}>
            {Icon && <Icon />}
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 ease-[var(--ease-out-expo)] group-data-[state=open]/collapsible:rotate-90" />
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
            <ChevronRight className="ml-auto size-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/nested:rotate-90" />
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
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function NavItemBadge({ badge }: { badge?: NavBadge }) {
  if (!badge) {
    return null;
  }

  return (
    <SidebarMenuBadge
      className={cn(
        "rounded-sm border capitalize",
        badge === "new" &&
          "border-green-600 text-green-600 peer-hover/menu-button:text-green-600 peer-data-active/menu-button:text-green-600",
        badge === "soon" && "border-muted-foreground text-muted-foreground",
      )}
    >
      {badge}
    </SidebarMenuBadge>
  );
}
