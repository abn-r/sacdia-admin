"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRoleBuckets } from "@/lib/users/role-buckets";
import type { UserRole } from "@/lib/rbac/types";

interface UserRolesOverviewProps {
  buckets: UserRoleBuckets;
}

export function UserRolesOverview({ buckets }: UserRolesOverviewProps) {
  const t = useTranslations("users.pages.detail.rolesOverview");
  const translateRole = useRoleLabel();

  return (
    <div className="space-y-3.5">
      <RoleBucketCard
        title={t("globalTitle")}
        description={t("globalDescription")}
        emptyLabel={t("noRoleAssigned")}
        roles={buckets.global}
        translateRole={translateRole}
      />
      <RoleBucketCard
        title={t("administrativeTitle")}
        description={t("administrativeDescription")}
        emptyLabel={t("noRoleAssigned")}
        roles={buckets.administrative}
        translateRole={translateRole}
      />
      <RoleBucketCard
        title={t("operationalTitle")}
        description={t("operationalDescription")}
        emptyLabel={t("noRoleAssigned")}
        roles={buckets.operational}
        translateRole={translateRole}
      />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldAlert className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t("clubSectionsTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("clubSectionsDescription")}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {buckets.clubSections.length === 0 ? (
            <p className="text-sm italic text-muted-foreground/70">{t("noRoleAssigned")}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/70">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">{t("clubColumn")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t("sectionColumn")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t("roleColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.clubSections.map((row) => (
                    <tr key={row.id} className="border-t border-border/70">
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {row.clubName ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {row.sectionName ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.roleName ? (
                          <Badge variant="secondary">{row.roleName}</Badge>
                        ) : (
                          <span className="text-sm italic text-muted-foreground/70">
                            {t("noRoleAssigned")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoleBucketCard({
  title,
  description,
  emptyLabel,
  roles,
  translateRole,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  roles: UserRole[];
  translateRole: (roleName: string | null | undefined) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {roles.length === 0 ? (
          <p className="text-sm italic text-muted-foreground/70">{emptyLabel}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.map((entry) => (
              <Badge key={entry.user_role_id} variant="secondary" className="text-xs">
                {translateRole(entry.roles.role_name)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
