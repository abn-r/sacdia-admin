"use client";

import Link from "next/link";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Calendar } from "lucide-react";
import { PLATFORM_LABELS, ACTIVITY_TYPE_LABELS } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";

interface ActivitiesTableProps {
  items: Activity[];
  onEdit?: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
}

function formatTime(time?: string | null): string {
  if (!time) return "—";
  return time;
}

export function ActivitiesTable({ items, onEdit, onDelete }: ActivitiesTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Sin actividades"
        description="No se encontraron actividades para los filtros seleccionados."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nombre
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tipo
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Hora
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Lugar
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Modalidad
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="h-9 w-32 px-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((activity) => {
            const typeLabel =
              activity.activity_type?.name ??
              ACTIVITY_TYPE_LABELS[activity.activity_type_id] ??
              `Tipo ${activity.activity_type_id}`;
            const platformLabel =
              activity.platform != null
                ? (PLATFORM_LABELS[activity.platform] ?? "—")
                : "Presencial";

            return (
              <TableRow key={activity.activity_id} className="hover:bg-muted/30">
                <TableCell className="px-3 py-2.5 align-middle">
                  <span className="font-medium">{activity.name}</span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Badge variant="secondary">{typeLabel}</Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                  {formatTime(activity.activity_time)}
                </TableCell>
                <TableCell className="max-w-[160px] px-3 py-2.5 align-middle">
                  <span className="truncate text-sm text-muted-foreground">
                    {activity.activity_place ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm">
                  {platformLabel}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <Badge variant={activity.active !== false ? "default" : "outline"}>
                    {activity.active !== false ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle">
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(activity)}
                        title="Editar actividad"
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(activity)}
                        title="Eliminar actividad"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/dashboard/activities/${activity.activity_id}`}>
                        <ChevronRight className="size-4" />
                        <span className="sr-only">Ver detalle</span>
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
