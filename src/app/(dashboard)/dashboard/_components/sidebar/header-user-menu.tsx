"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resetAnalyticsUser } from "@/lib/analytics/posthog";
import { getAuthUserAvatar, getAuthUserDisplayName } from "@/lib/auth/display-name";
import { useAuth } from "@/lib/auth/auth-context";
import { getInitials } from "@/lib/utils";

export function HeaderUserMenu() {
  const { user } = useAuth();
  const t = useTranslations("nav");

  if (!user) {
    return null;
  }

  const name = getAuthUserDisplayName(user);
  const avatar = getAuthUserAvatar(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t("userMenu")} className="rounded-lg max-md:grid max-md:size-11 max-md:place-items-center outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={avatar || undefined} alt={name} />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-sm">{name}</span>
            <span className="text-muted-foreground text-xs">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/api/auth/logout?next=/login" onClick={() => resetAnalyticsUser()}>
            <LogOut />
            {t("logout")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
