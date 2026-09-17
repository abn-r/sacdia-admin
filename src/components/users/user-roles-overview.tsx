"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClubSectionRoleRow } from "@/lib/users/role-buckets";

interface UserRolesOverviewProps {
  clubSections: ClubSectionRoleRow[];
}

export function UserRolesOverview({ clubSections }: UserRolesOverviewProps) {
  const t = useTranslations("users.pages.detail.rolesOverview");

  return (
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
        {clubSections.length === 0 ? (
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
                {clubSections.map((row) => (
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
  );
}
