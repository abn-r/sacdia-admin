"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/lib/auth/use-permissions";
import { navConfig, isSubGroup, type NavGroup, type NavItem, type NavChild, type NavSubGroup } from "@/components/layout/nav-config";
import { LocaleSwitcherMenu } from "@/components/layout/locale-switcher";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "A").toUpperCase();
}

function flattenChildren(children: NavItem["children"]): NavChild[] {
  if (!children) return [];
  if (children.length === 0) return [];
  if (isSubGroup(children[0])) {
    return (children as NavSubGroup[]).flatMap((sg) => sg.items);
  }
  return children as NavChild[];
}

function canSeePermission(
  permission: string | undefined,
  can: (permission: string) => boolean,
  isSuperAdmin: boolean,
) {
  if (isSuperAdmin) return true;
  if (!permission) return true;
  return can(permission);
}

function filterChildrenByPermission(
  children: NavItem["children"],
  can: (permission: string) => boolean,
  isSuperAdmin: boolean,
): NavItem["children"] {
  if (!children || children.length === 0) return undefined;

  if (isSubGroup(children[0])) {
    const groups = (children as NavSubGroup[])
      .map((group) => ({
        ...group,
        items: group.items.filter((child) =>
          canSeePermission(child.permission, can, isSuperAdmin),
        ),
      }))
      .filter((group) => group.items.length > 0);

    return groups.length > 0 ? groups : undefined;
  }

  const filtered = (children as NavChild[]).filter((child) =>
    canSeePermission(child.permission, can, isSuperAdmin),
  );
  return filtered.length > 0 ? filtered : undefined;
}

function visibleNavItem(
  item: NavItem,
  can: (permission: string) => boolean,
  isSuperAdmin: boolean,
): NavItem | null {
  const children = filterChildrenByPermission(item.children, can, isSuperAdmin);
  const parentVisible = canSeePermission(item.permission, can, isSuperAdmin);

  if (children) {
    return { ...item, children };
  }

  if (parentVisible) {
    return { ...item, children: undefined };
  }

  return null;
}

function NavSubChildLink({
  child,
  pathname,
  t,
}: {
  child: NavChild;
  pathname: string;
  t: ReturnType<typeof useTranslations<"nav">>;
}) {
  const childTitle = t(child.title as Parameters<typeof t>[0]);
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={pathname === child.url}>
        <Link href={child.url}>
          <span className="truncate" title={childTitle}>{childTitle}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function NavItemWithChildren({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations("nav");
  const flatChildren = flattenChildren(item.children);
  const isChildActive = flatChildren.some((child) => pathname === child.url);
  const isActive = pathname === item.url || isChildActive;
  const title = t(item.title as Parameters<typeof t>[0]);
  const grouped = item.children && item.children.length > 0 && isSubGroup(item.children[0]);

  return (
    <Collapsible asChild defaultOpen={isActive}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={title} isActive={isActive} className="transition-colors duration-200">
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate" title={title}>{title}</span>
            <ChevronRight className="ml-auto h-[18px] w-[18px] shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {grouped
              ? (item.children as NavSubGroup[]).map((sg) => {
                  const sgLabel = t(sg.subgroup as Parameters<typeof t>[0]);
                  const labelId = `sidebar-subgroup-${item.url.replace(/[^a-z0-9]/gi, "-")}-${sg.subgroup}`;
                  return (
                    <li
                      key={sg.subgroup}
                      role="group"
                      aria-labelledby={labelId}
                      className="mt-1 list-none first:mt-0"
                    >
                      <h3
                        id={labelId}
                        className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70"
                      >
                        {sgLabel}
                      </h3>
                      <ul className="flex min-w-0 flex-col gap-1">
                        {sg.items.map((child) => (
                          <NavSubChildLink key={child.url} child={child} pathname={pathname} t={t} />
                        ))}
                      </ul>
                    </li>
                  );
                })
              : (item.children as NavChild[]).map((child) => (
                  <NavSubChildLink key={child.url} child={child} pathname={pathname} t={t} />
                ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavItemSimple({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations("nav");
  const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url + "/"));
  const title = t(item.title as Parameters<typeof t>[0]);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={title} isActive={isActive} className="transition-colors duration-200">
        <Link href={item.url}>
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate" title={title}>{title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarNavGroup({ group }: { group: NavGroup }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { can, isSuperAdmin } = usePermissions();

  const visibleItems = group.items
    .map((item) => visibleNavItem(item, can, isSuperAdmin))
    .filter((item): item is NavItem => item !== null);

  if (visibleItems.length === 0) return null;

  return (
    <SidebarGroup>
      {group.label && <SidebarGroupLabel>{t(group.label as Parameters<typeof t>[0])}</SidebarGroupLabel>}
      <SidebarMenu>
        {visibleItems.map((item) =>
          item.children ? (
            <NavItemWithChildren key={item.url} item={item} pathname={pathname} />
          ) : (
            <NavItemSimple key={item.url} item={item} pathname={pathname} />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

const LOGOUT_URL = "/api/auth/logout?next=/login";

function SidebarUserFooter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslations("nav");
  const displayName = user?.name ?? user?.email ?? "Admin";
  const email = user?.email ?? "";
  const photoUrl =
    user?.picture_url ??
    user?.user_image ??
    user?.avatar_url ??
    user?.photo_url ??
    user?.profile_picture_url ??
    (typeof user?.profile_picture === "string" ? user.profile_picture : null) ??
    null;

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent"
              >
                <Avatar className="size-8 rounded-lg">
                  {photoUrl && <AvatarImage src={photoUrl} alt={displayName} />}
                  <AvatarFallback className="rounded-lg text-xs">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56"
              side="top"
              align="start"
              sideOffset={8}
            >
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/users/${user?.id ?? ""}`}>
                  <User className="size-4" />
                  {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <LocaleSwitcherMenu />
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <button
                  onClick={() => {
                    queryClient.clear();
                    window.location.href = LOGOUT_URL;
                  }}
                  aria-label={t("logout")}
                >
                  <LogOut className="size-4" />
                  {t("logout")}
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

export function AppSidebar() {
  const t = useTranslations("nav");

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Image src="/svg/LogoSACDIA.svg" alt="SACDIA" width={48} height={48} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SACDIA</span>
                  <span className="truncate text-xs text-muted-foreground">{t("adminPanel")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navConfig.map((group, idx) => (
          <SidebarNavGroup key={group.label ?? idx} group={group} />
        ))}
      </SidebarContent>

      <SidebarUserFooter />
    </Sidebar>
  );
}
