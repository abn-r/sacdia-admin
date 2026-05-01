"use client";

import { Pencil, Settings2 } from "lucide-react";
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
import type { SystemConfig } from "@/lib/api/system-config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeVariant(type?: string | null): "default" | "secondary" | "outline" {
  switch (type) {
    case "boolean": return "secondary";
    case "number": return "outline";
    case "json": return "default";
    default: return "outline";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemConfigTableProps {
  configs: SystemConfig[];
  onEdit: (config: SystemConfig) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SystemConfigTable({ configs, onEdit }: SystemConfigTableProps) {
  if (configs.length === 0) {
    return (
      <EmptyState
        icon={Settings2}
        title="Sin configuraciones"
        description="No hay entradas de configuración del sistema registradas."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Clave
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Valor
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Descripción
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tipo
            </TableHead>
            <TableHead className="h-9 px-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => (
            <TableRow key={config.key} className="hover:bg-muted/30">
              <TableCell className="px-3 py-2.5 align-middle">
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                  {config.key}
                </code>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle max-w-52">
                <span className="line-clamp-2 text-sm font-medium">
                  {config.config_value}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle max-w-64">
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {config.description ?? "—"}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                {config.value_type ? (
                  <Badge variant={getTypeVariant(config.value_type)} className="text-xs">
                    {config.value_type}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle">
                <div className="flex items-center justify-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(config)}
                        aria-label={`Editar ${config.key}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar valor</TooltipContent>
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
