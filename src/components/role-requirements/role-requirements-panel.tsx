"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusIntent } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import {
  RoleRequirementEditDialog,
  ROLE_REQUIREMENTS_KEY,
} from "@/components/role-requirements/role-requirement-edit-dialog";
import { useRoleLabel } from "@/components/service-credentials/service-credential-shared";
import {
  listRoleRequirements,
  type RoleRequirement,
  type RoleRequirementMode,
} from "@/lib/api/role-requirements";
import { useScreenAccess } from "@/lib/auth/screen-catalog/use-screen-access";
import { useFormatDate } from "@/lib/format-locale";

const MODE_INTENT: Record<RoleRequirementMode, StatusIntent> = {
  INFO: "neutral",
  WARN: "warning",
  BLOCK: "primary",
};

const HEAD_CLASS = "h-9 px-3 text-xs font-medium text-muted-foreground";

export function RoleRequirementsPanel() {
  const t = useTranslations("role_requirements");
  const roleLabel = useRoleLabel();
  const formatDate = useFormatDate();
  const { canCapability } = useScreenAccess();
  const canUpdate = canCapability("role-requirements", "update");
  const [editing, setEditing] = useState<RoleRequirement | null>(null);

  const query = useQuery({
    queryKey: ROLE_REQUIREMENTS_KEY,
    queryFn: listRoleRequirements,
    staleTime: 30_000,
  });

  if (query.isPending) {
    return (
      <div className="space-y-3" aria-busy="true" data-testid="role-requirements-loading">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <EndpointErrorBanner
        state="missing"
        detail={t("error.title")}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }

  const rows = query.data;
  if (rows.length === 0) {
    return <EmptyState icon={ListChecks} title={t("empty.title")} description={t("empty.description")} />;
  }

  function requirementName(type: string): string {
    const key = `requirementType.${type}`;
    return t.has(key as Parameters<typeof t.has>[0]) ? t(key as Parameters<typeof t>[0]) : type;
  }

  function effectiveLabel(row: RoleRequirement): string {
    if (row.effective_from) return formatDate(row.effective_from);
    return row.mode === "BLOCK" ? t("table.immediate") : t("table.none");
  }

  return (
    <>
      <DataTableShell>
        <Table className="max-md:block">
          <TableHeader className="max-md:sr-only">
            <TableRow>
              <TableHead className={HEAD_CLASS}>{t("table.role")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("table.clubType")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("table.requirement")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("table.mode")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("table.effectiveFrom")}</TableHead>
              <TableHead className={HEAD_CLASS}>{t("table.equivalent")}</TableHead>
              {canUpdate ? (
                <TableHead className={`${HEAD_CLASS} text-right`}>{t("table.actions")}</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody className="max-md:block">
            {rows.map((row) => {
              const muted =
                "px-3 py-2.5 align-middle text-sm text-muted-foreground max-md:p-0 max-md:text-[13px]";
              const role = roleLabel(row.role.name);
              return (
                <TableRow
                  key={row.requirement_id}
                  className="hover:bg-muted/30 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-1 max-md:px-4 max-md:py-3"
                >
                  <TableCell className="px-3 py-2.5 align-middle text-sm font-medium max-md:order-1 max-md:min-w-0 max-md:flex-1 max-md:p-0">
                    {role}
                  </TableCell>
                  <TableCell className={`${muted} max-md:order-4`}>
                    {row.club_type?.name ?? t("table.allClubTypes")}
                  </TableCell>
                  <TableCell className={`${muted} max-md:order-5`}>
                    {requirementName(row.requirement_type)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle max-md:order-2 max-md:p-0">
                    <StatusBadge
                      intent={MODE_INTENT[row.mode]}
                      label={t(`modes.${row.mode}`)}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className={`${muted} tabular-nums max-md:order-6`}>
                    {effectiveLabel(row)}
                  </TableCell>
                  <TableCell className={`${muted} max-md:order-7`}>
                    {row.equivalent_certification?.name ?? t("table.none")}
                  </TableCell>
                  {canUpdate ? (
                    <TableCell className="px-3 py-2.5 text-right align-middle max-md:order-3 max-md:p-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`${t("table.edit")}: ${role}`}
                        onClick={() => setEditing(row)}
                      >
                        {t("table.edit")}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      {editing ? (
        <RoleRequirementEditDialog
          key={editing.requirement_id}
          requirement={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
