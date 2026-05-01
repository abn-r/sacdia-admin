"use client";

import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import type { AttendanceRecord } from "@/lib/api/activities";

interface AttendancePanelProps {
  records: AttendanceRecord[];
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getUserDisplayName(
  user?: AttendanceRecord["user"],
  fallbackId?: string,
): string {
  if (!user) return fallbackId ?? "—";
  const first = user.first_name?.trim() ?? "";
  const last = user.last_name?.trim() ?? "";
  const full = [first, last].filter(Boolean).join(" ");
  return full || user.email || user.user_id || fallbackId || "—";
}

export function AttendancePanel({ records }: AttendancePanelProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sin registros de asistencia"
        description="No hay asistentes registrados para esta actividad."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Usuario
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Registrado
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const displayName = getUserDisplayName(
              record.user ?? undefined,
              record.user_id,
            );
            return (
              <TableRow
                key={`${record.activity_id}-${record.user_id}`}
                className="hover:bg-muted/30"
              >
                <TableCell className="px-3 py-2.5 align-middle">
                  <span className="text-sm font-medium">{displayName}</span>
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                  {record.user?.email ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums">
                  {formatDate(record.attended_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
