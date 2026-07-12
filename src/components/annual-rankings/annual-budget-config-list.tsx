"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AnnualBudgetDeleteDialog } from "@/components/annual-rankings/annual-budget-delete-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { configLabel } from "@/lib/annual-rankings/annual-ranking-config-utils";
import type { AnnualRankingConfig } from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";
import { usePanelPath } from "@/lib/v2/panel-path-context";

interface AnnualBudgetConfigListProps {
  configs: AnnualRankingConfig[];
  unions: Union[];
  localFields: LocalField[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
}

export function AnnualBudgetConfigList({
  configs,
  unions,
  localFields,
  clubTypes,
  ecclesiasticalYears,
}: AnnualBudgetConfigListProps) {
  const t = useTranslations("annual_folders.budgetConfigList");
  const router = useRouter();
  const { toPanelPath } = usePanelPath();
  const routeBase = toPanelPath("/dashboard/annual-folders/ranking-config");
  const [deleteTarget, setDeleteTarget] = useState<AnnualRankingConfig | null>(
    null,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-base font-semibold">Presupuestos configurados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada registro define el puntaje máximo anual y su distribución por
            secciones para un alcance, año y tipo de club.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href={`${routeBase}/new`}>
            <Plus className="size-4" />
            Nueva configuración
          </Link>
        </Button>
      </div>

      {configs.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        >
          <Button asChild size="sm">
            <Link href={`${routeBase}/new`}>Nueva configuración</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alcance</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Tipo de club</TableHead>
                <TableHead className="text-right">Puntaje máximo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config, index) => {
                const { scopeName, year, clubType } = configLabel(
                  config,
                  unions,
                  localFields,
                  clubTypes,
                  ecclesiasticalYears,
                );

                return (
                  <TableRow
                    key={config.annual_ranking_config_id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{
                      animationDelay: `${index * 40}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {config.union_id != null ? "Unión" : "Campo local"}
                        </Badge>
                        <span className="font-medium">{scopeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{year}</TableCell>
                    <TableCell>{clubType}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {config.max_points.toLocaleString("es-MX")} pts
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        intent={config.active ? "success" : "neutral"}
                        label={config.active ? "Activa" : "Inactiva"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8"
                              asChild
                            >
                              <Link
                                href={`${routeBase}/${config.annual_ranking_config_id}`}
                              >
                                <Pencil className="size-3.5" />
                                <span className="sr-only">Editar</span>
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(config)}
                            >
                              <Trash2 className="size-3.5" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          Mostrando{" "}
          <span className="font-medium text-foreground">{configs.length}</span>{" "}
          {configs.length === 1 ? "registro" : "registros"}
        </p>
      </div>

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
        scopeLabel={
          deleteTarget
            ? configLabel(
                deleteTarget,
                unions,
                localFields,
                clubTypes,
                ecclesiasticalYears,
              ).scopeName
            : ""
        }
      />
    </div>
  );
}
