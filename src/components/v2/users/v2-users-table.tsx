"use client";

import { usePanelPath } from "@/lib/v2/panel-path-context";
"use no memo";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/users/user-avatar";
import { V2DataTable } from "@/components/v2/shared/v2-data-table";
import type { AdminUser } from "@/lib/api/admin-users";
import {
  getAdminUserDisplayName,
  getAdminUserSecondaryLabel,
} from "@/lib/admin-users/display";
import { buildRoleTranslator } from "@/lib/auth/role-labels";
import { extractAdminUserRoleNames } from "@/lib/admin-users/role-names";

export function V2UsersTable({
  users,
}: {
  users: AdminUser[];
}) {
  const { toPanelPath } = usePanelPath();

  const t = useTranslations("users");
  const translateRole = buildRoleTranslator(useTranslations("roles"));

  const columns: ColumnDef<AdminUser>[] = [
    {
      id: "user",
      header: t("list.columns.user"),
      cell: ({ row }) => {
        const user = row.original;
        const fullName = getAdminUserDisplayName(user, {
          deletedAccount: t("list.deletedAccount"),
        });
        const secondaryLabel = getAdminUserSecondaryLabel(user, {
          anonymized: t("list.anonymizedAccount"),
        });
        return (
          <div className="flex items-center gap-3">
            <UserAvatar
              src={user.user_image}
              name={fullName}
              email={secondaryLabel}
              size={36}
            />
            <div className="min-w-0">
              <Link
                href={toPanelPath(`/dashboard/users/${user.user_id}`)}
                className="truncate text-sm font-medium hover:underline"
              >
                {fullName}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {secondaryLabel}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "roles",
      header: t("list.columns.roles"),
      cell: ({ row }) => {
        const roleNames = extractAdminUserRoleNames(row.original);
        if (roleNames.length === 0) {
          return (
            <Badge variant="outline" className="text-xs font-normal">
              {t("list.noRole")}
            </Badge>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {roleNames.slice(0, 2).map((role) => (
              <Badge key={role} variant="secondary" className="text-xs font-normal">
                {translateRole(role)}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("list.columns.status"),
      cell: ({ row }) => (
        <Badge variant={row.original.active !== false ? "default" : "outline"}>
          {row.original.active !== false ? t("list.status.active") : t("list.status.inactive")}
        </Badge>
      ),
    },
    {
      id: "location",
      header: t("list.columns.location"),
      cell: ({ row }) => {
        const union = row.original.union?.name;
        const localField = row.original.local_field?.name;
        if (!union && !localField) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="min-w-0 text-xs">
            <p className="truncate">{union ?? "—"}</p>
            {localField ? (
              <p className="truncate text-muted-foreground">{localField}</p>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <V2DataTable
      columns={columns}
      data={users}
      getRowId={(row) => row.user_id}
      emptyMessage={t("pages.list.emptyTitle")}
      onRowClick={(user) => {
        window.location.href = toPanelPath(`/dashboard/users/${user.user_id}`);
      }}
    />
  );
}
