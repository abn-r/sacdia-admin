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
import { navConfig, type NavGroup, type NavItem } from "@/components/layout/nav-config";
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

function NavItemWithChildren({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations("nav");
  const isChildActive = item.children?.some((child) => pathname === child.url) ?? false;
  const isActive = pathname === item.url || isChildActive;
  const title = t(item.title);

  return (
    <Collapsible asChild defaultOpen={isActive}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={title} isActive={isActive}>
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{title}</span>
            <ChevronRight className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => {
              const childTitle = t(child.title);
              return (
                <SidebarMenuSubItem key={child.url}>
                  <SidebarMenuSubButton asChild isActive={pathname === child.url}>
                    <Link href={child.url}>
                      <span className="truncate" title={childTitle}>{childTitle}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavItemSimple({ item, pathname }: { item: NavItem; pathname: string }) {
  const t = useTranslations("nav");
  const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url + "/"));
  const title = t(item.title);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={title} isActive={isActive}>
        <Link href={item.url}>
          <item.icon className="size-4 shrink-0" />
          <span className="truncate">{title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarNavGroup({ group }: { group: NavGroup }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { can, isSuperAdmin } = usePermissions();

  const visibleItems = group.items.filter((item) => {
    if (isSuperAdmin) return true;
    if (!item.permission) return true;
    return can(item.permission);
  });

  if (visibleItems.length === 0) return null;

  return (
    <SidebarGroup>
      {group.label && <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>}
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
                  <User className="mr-2 size-4" />
                  Mi perfil
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
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="mr-2 size-4" />
                  Cerrar sesión
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
                  <span className="truncate text-xs text-muted-foreground">Panel Administrativo</span>
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
