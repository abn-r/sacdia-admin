"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClubSectionRoleRow } from "@/lib/users/role-buckets";

interface UserRolesOverviewProps {
  clubSections: ClubSectionRoleRow[];
}

/** Clubs and cargos of the person: one row per club section. */
export function UserRolesOverview({ clubSections }: UserRolesOverviewProps) {
  const t = useTranslations("users.pages.detail.rolesOverview");

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-semibold text-base tracking-tight">{t("clubSectionsTitle")}</h3>
        <p className="text-muted-foreground text-sm">{t("clubSectionsDescription")}</p>
      </div>
      {clubSections.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noRoleAssigned")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("clubColumn")}</TableHead>
                <TableHead>{t("sectionColumn")}</TableHead>
                <TableHead>{t("roleColumn")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clubSections.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.clubName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.sectionName ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.roleName ? (
                      <Badge variant="secondary">{row.roleName}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {t("noRoleAssigned")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
