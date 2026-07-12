"use client";

import { usePanelPath } from "@/lib/v2/panel-path-context";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AdminUser } from "@/lib/api/admin-users";
import {
  getAdminUserDisplayName,
  getAdminUserSecondaryLabel,
} from "@/lib/admin-users/display";
import { extractAdminUserRoleNames } from "@/lib/admin-users/role-names";
import { useRoleLabel } from "@/lib/auth/role-labels";

export function V2RecentUsersList({ users }: { users: AdminUser[] }) {
  const { toPanelPath } = usePanelPath();

  const t = useTranslations("dashboardHub");
  const translateRole = useRoleLabel();
  const safeUsers = Array.isArray(users) ? users : [];

  if (safeUsers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("recentUsers.loadError")}</p>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {safeUsers.map((user) => {
        const fullName = getAdminUserDisplayName(user, {
          deletedAccount: t("recentUsers.deletedAccount"),
        });
        const secondaryLabel = getAdminUserSecondaryLabel(user, {
          anonymized: t("recentUsers.anonymizedAccount"),
        });
        const uniqueRoles = extractAdminUserRoleNames(user);

        return (
          <div key={user.user_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs font-medium">
                {(fullName[0] ?? "?").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link
                href={toPanelPath(`/dashboard/users/${user.user_id}`)}
                prefetch={false}
                className="block truncate text-sm font-medium hover:underline"
              >
                {fullName}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{secondaryLabel}</p>
            </div>
            <Badge variant="secondary" className="hidden text-xs sm:inline-flex">
              {uniqueRoles[0] ? translateRole(uniqueRoles[0]) : t("recentUsers.noRole")}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
