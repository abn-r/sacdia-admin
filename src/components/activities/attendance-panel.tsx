"use client";

import { Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
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
import { SACDIA_DISPLAY_TIMEZONE } from "@/lib/format-locale";
import type { AttendanceRecord } from "@/lib/api/activities";

interface AttendancePanelProps {
  records: AttendanceRecord[];
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
  const t = useTranslations("activities");
  const format = useFormatter();

  function formatDate(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return format.dateTime(date, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: SACDIA_DISPLAY_TIMEZONE,
    });
  }

  if (records.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("attendance.emptyTitle")}
        description={t("attendance.emptyDescription")}
      />
    );
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("attendance.colUser")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("attendance.colEmail")}
            </TableHead>
            <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">
              {t("attendance.colRegistered")}
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
    </DataTableShell>
  );
}
