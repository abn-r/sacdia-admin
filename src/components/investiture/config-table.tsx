"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { Settings2 } from "lucide-react";
import type { InvestitureConfig } from "@/lib/api/investiture";
import { useFormatDate } from "@/lib/format-locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigTableProps {
  configs: InvestitureConfig[];
  onEdit: (config: InvestitureConfig) => void;
  onDelete: (config: InvestitureConfig) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfigTable({ configs, onEdit, onDelete }: ConfigTableProps) {
  const t = useTranslations("investiture");
  const formatDate = useFormatDate();

  if (configs.length === 0) {
    return (
      <EmptyState
        icon={Settings2}
        title={t("configTable.emptyTitle")}
        description={t("configTable.emptyDescription")}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("configTable.colLocalField")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("configTable.colYear")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("configTable.colSubmissionDeadline")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("configTable.colInvestitureDate")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("configTable.colStatus")}
            </TableHead>
            <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("configTable.colActions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => (
            <TableRow key={config.investiture_config_id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle font-medium">
                {config.local_fields?.name ?? t("configTable.fieldFallback", { id: config.local_field_id })}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                {config.ecclesiastical_years?.name ?? t("configTable.yearFallback", { id: config.ecclesiastical_year_id })}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                {config.submission_deadline ? formatDate(config.submission_deadline) : "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                {config.investiture_date ? formatDate(config.investiture_date) : "—"}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                {config.active ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    {t("configTable.statusActive")}
                  </Badge>
                ) : (
                  <Badge variant="destructive">{t("configTable.statusInactive")}</Badge>
                )}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(config)}
                        aria-label={t("configTable.ariaEdit")}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("configTable.tooltipEdit")}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(config)}
                        aria-label={t("configTable.ariaDeactivate")}
                        disabled={!config.active}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {config.active
                        ? t("configTable.tooltipDeactivate")
                        : t("configTable.tooltipAlreadyInactive")}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
