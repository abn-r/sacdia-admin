"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarOff, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActions, RowActionsHead } from "@/components/shared/row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { activityAudienceText } from "@/components/activities/activity-audience-label";
import type { Activity } from "@/lib/api/activities";
import { PLATFORM_VIRTUAL } from "@/lib/activities/form";
import { activityPhase, formatDayLabel } from "@/lib/activities/view";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [20, 50, 100];

interface ActivitiesListProps {
  activities: Activity[];
  today: string;
  /** Section label by `club_section_id`. */
  sectionLabels: Record<number, string>;
  detailPath: (activityId: number) => string;
  editPath: (activityId: number) => string;
  canEdit: boolean;
  onDelete: (activity: Activity) => void;
}

/** The Lista view: the month as rows, with edit and delete in the row menu. The parent keys it by period so a new month starts on page 1. */
export function ActivitiesList({
  activities,
  today,
  sectionLabels,
  detailPath,
  editPath,
  canEdit,
  onDelete,
}: ActivitiesListProps) {
  const t = useTranslations("people.activities");
  const tOld = useTranslations("activities");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0] ?? 20);

  if (activities.length === 0) {
    return <EmptyState icon={CalendarOff} title={t("list.emptyTitle")} description={t("list.emptyDescription")} />;
  }

  const totalPages = Math.max(1, Math.ceil(activities.length / limit));
  const current = Math.min(page, totalPages);
  const rows = activities.slice((current - 1) * limit, current * limit);

  const audienceLabels = {
    all: tOld("audience.all"),
    board: tOld("audience.board"),
    classes: tOld("audience.classes"),
  };

  function rowParts(activity: Activity) {
    const past = activityPhase(activity, today) === "past";
    const start = activity.activity_date ?? null;
    const end = activity.activity_end_date && activity.activity_end_date !== start ? activity.activity_end_date : null;
    const dateText = start
      ? end
        ? `${formatDayLabel(start, locale)} – ${formatDayLabel(end, locale)}`
        : formatDayLabel(start, locale)
      : "—";
    const place =
      activity.platform === PLATFORM_VIRTUAL ? t("modalities.virtual") : activity.activity_place.trim() || "—";
    const detail = [
      activityAudienceText(activity, audienceLabels),
      activity.activity_series_id ? t("list.repeats") : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const section = sectionLabels[activity.club_section_id] ?? "—";
    return { past, dateText, place, detail, section };
  }

  function actions(activity: Activity) {
    return (
      <RowActions
        label={activity.name}
        actions={[
          { label: t("list.edit"), icon: Pencil, href: editPath(activity.activity_id), hidden: !canEdit },
          { label: t("list.delete"), icon: Trash2, destructive: true, hidden: !canEdit, onSelect: () => onDelete(activity) },
        ]}
      />
    );
  }

  return (
    <div className="space-y-3">
      <DataTableShell className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("list.colDate")}</TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("list.colActivity")}</TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("list.colSection")}</TableHead>
              <TableHead className="h-9 px-3 text-xs font-medium text-muted-foreground">{t("list.colPlace")}</TableHead>
              <RowActionsHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((activity) => {
              const { past, dateText, place, detail, section } = rowParts(activity);
              return (
                <TableRow key={activity.activity_id} data-phase={past ? "past" : "current"} className={cn("hover:bg-muted/30", past && "text-muted-foreground")}>
                  <TableCell className="whitespace-nowrap px-3 py-2.5 align-middle">
                    <span className="block font-medium tabular-nums">{dateText}</span>
                    {activity.activity_time ? (
                      <span className="block text-[13px] tabular-nums text-muted-foreground">{activity.activity_time}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">
                    <Link
                      href={detailPath(activity.activity_id)}
                      className="rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {activity.name}
                    </Link>
                    <span className="block text-[13px] text-muted-foreground">{detail}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">{section}</TableCell>
                  <TableCell className="max-w-64 truncate px-3 py-2.5 align-middle">{place}</TableCell>
                  <TableCell className="px-3 py-2.5 align-middle">{actions(activity)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableShell>

      <DataTableShell className="md:hidden">
        <ul aria-label={t("list.label")} className="divide-y">
          {rows.map((activity) => {
            const { past, dateText, place, detail, section } = rowParts(activity);
            return (
              <li
                key={activity.activity_id}
                data-phase={past ? "past" : "current"}
                className={cn("flex items-start justify-between gap-2 px-4 py-3", past && "text-muted-foreground")}
              >
                <div className="min-w-0 space-y-0.5">
                  <Link
                    href={detailPath(activity.activity_id)}
                    className="block truncate rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {activity.name}
                  </Link>
                  <p className="flex flex-wrap gap-x-3 text-[13px] tabular-nums text-muted-foreground">
                    <span>{[dateText, activity.activity_time].filter(Boolean).join(" · ")}</span>
                    <span>{section}</span>
                    <span className="truncate">{place}</span>
                  </p>
                  <p className="text-[13px] text-muted-foreground">{detail}</p>
                </div>
                {actions(activity)}
              </li>
            );
          })}
        </ul>
      </DataTableShell>

      <DataTablePagination
        page={current}
        totalPages={totalPages}
        total={activities.length}
        limit={limit}
        limitOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />
    </div>
  );
}
