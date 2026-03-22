"use client";

import { Pencil, Trash2 } from "lucide-react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigTableProps {
  configs: InvestitureConfig[];
  onEdit: (config: InvestitureConfig) => void;
  onDelete: (config: InvestitureConfig) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfigTable({ configs, onEdit, onDelete }: ConfigTableProps) {
  if (configs.length === 0) {
    return (
      <EmptyState
        icon={Settings2}
        title="Sin configuraciones"
        description="No hay configuraciones de investidura registradas. Creá una para comenzar."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Campo Local
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Año Eclesiástico
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Límite de Envío
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fecha de Investidura
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => (
            <TableRow key={config.investiture_config_id} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle font-medium">
                {config.local_fields?.name ?? `Campo #${config.local_field_id}`}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                {config.ecclesiastical_years?.name ?? `Año #${config.ecclesiastical_year_id}`}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                {formatDate(config.submission_deadline)}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums text-muted-foreground">
                {formatDate(config.investiture_date)}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                {config.active ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="destructive">Inactivo</Badge>
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
                        aria-label="Editar configuración"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(config)}
                        aria-label="Desactivar configuración"
                        disabled={!config.active}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {config.active ? "Desactivar" : "Ya inactivo"}
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
