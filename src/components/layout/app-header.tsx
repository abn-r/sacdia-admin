"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { useAuth } from "@/lib/auth/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

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

export function AppHeader() {
  const { user } = useAuth();
  const displayName = user?.name ?? user?.email ?? "Admin";
  const photoUrl =
    user?.picture_url ??
    user?.user_image ??
    user?.avatar_url ??
    user?.photo_url ??
    user?.profile_picture_url ??
    (typeof user?.profile_picture === "string" ? user.profile_picture : null) ??
    null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />

      {/* Vertical divider */}
      <div className="h-4 w-px bg-border" />

      <AppBreadcrumbs />

      {/* Right side: user avatar */}
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Menú de usuario"
            >
              <Avatar className="size-7">
                {photoUrl && (
                  <AvatarImage src={photoUrl} alt={displayName} />
                )}
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
                {displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" sideOffset={6}>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/users/${user?.id ?? ""}`}>
                <User className="mr-2 size-4" />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/api/auth/logout?next=/login">
                <LogOut className="mr-2 size-4" />
                Cerrar sesión
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
