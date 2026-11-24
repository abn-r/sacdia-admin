"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnnualBudgetDeleteDialog } from "@/components/annual-rankings/annual-budget-delete-dialog";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { configLabel } from "@/lib/annual-rankings/annual-ranking-config-utils";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";
import { useFormatNumber } from "@/lib/format-locale";

const ROUTE_BASE = "/dashboard/annual-folders/ranking-config";

interface AnnualBudgetConfigListProps {
  configs: AnnualRankingConfig[];
  unions: Union[];
  localFields: LocalField[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  createBlocked?: boolean;
}

export function AnnualBudgetConfigList({
  configs,
  unions,
  localFields,
  clubTypes,
  ecclesiasticalYears,
  createBlocked = false,
}: AnnualBudgetConfigListProps) {
  const t = useTranslations("evaluation.progress.annual.config.budgets");
  const router = useRouter();
  const formatNumber = useFormatNumber();
  const [deleteTarget, setDeleteTarget] = useState<AnnualRankingConfig | null>(null);

  const labelOf = (config: AnnualRankingConfig) =>
    configLabel(config, unions, localFields, clubTypes, ecclesiasticalYears);

  return (
    <div className="space-y-4">
      {configs.length === 0 ? (
        <EmptyState icon={Plus} title={t("emptyTitle")} description={t("emptyDescription")}>
          {!createBlocked && (
            <Button asChild size="sm">
              <Link href={`${ROUTE_BASE}/new`}>{t("new")}</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colScope")}</TableHead>
                <TableHead>{t("colYear")}</TableHead>
                <TableHead>{t("colClubType")}</TableHead>
                <TableHead className="text-right">{t("colMax")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <RowActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => {
                const { scopeName, year, clubType } = labelOf(config);
                return (
                  <TableRow key={config.annual_ranking_config_id}>
                    <TableCell>
                      <span className="font-medium">{scopeName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {config.union_id != null ? t("scopeUnion") : t("scopeLocalField")}
                      </span>
                    </TableCell>
                    <TableCell>{year}</TableCell>
                    <TableCell>{clubType}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t("points", { points: formatNumber(config.max_points) })}
                    </TableCell>
                    <TableCell>
                      <ExceptionStatus
                        value={config.active ? "active" : "inactive"}
                        normal={["active"]}
                        labels={{ active: t("active"), inactive: t("inactive") }}
                        intents={{ inactive: "neutral" }}
                      />
                    </TableCell>
                    <TableCell>
                      <RowActions
                        label={scopeName}
                        actions={[
                          {
                            label: t("edit"),
                            icon: Pencil,
                            href: `${ROUTE_BASE}/${config.annual_ranking_config_id}`,
                          },
                          {
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => setDeleteTarget(config),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <AnnualBudgetDeleteDialog
        config={deleteTarget}
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
        scopeLabel={deleteTarget ? labelOf(deleteTarget).scopeName : ""}
      />
    </div>
  );
}
