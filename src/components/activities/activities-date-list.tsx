"use client";

import Link from "next/link";
import { Building2, ChevronRight, Clock, MapPin } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_TYPE_LABELS, type Activity } from "@/lib/api/activities";
import {
  getActivityDateKey,
  parseDateKey,
  sortActivitiesByTime,
} from "@/lib/activities/helpers";
import { cn } from "@/lib/utils";

interface ActivitiesDateListProps {
  activities: Activity[];
  detailPath: (activityId: number) => string;
}

function getDateParts(dateKey: string) {
  const date = parseDateKey(dateKey);
  return {
    weekday: date.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", ""),
    day: date.getDate(),
    month: date.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
  };
}

function formatShortDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRangeShort(activity: Activity): string | null {
  const start = getActivityDateKey(activity);
  if (!start) return null;
  const end = activity.activity_end_date;
  if (!end || end === start) return formatShortDate(start);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function MetaItem({
  icon: Icon,
  children,
  className,
}: {
  icon: typeof Clock;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

function ActivityListCard({
  activity,
  href,
}: {
  activity: Activity;
  href: string;
}) {
  const dateKey = getActivityDateKey(activity);
  const dateParts = dateKey ? getDateParts(dateKey) : null;
  const dateRangeLabel = formatDateRangeShort(activity);
  const typeLabel =
    activity.activity_type?.name ??
    ACTIVITY_TYPE_LABELS[activity.activity_type_id] ??
    "";

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/20"
    >
      {dateParts ? (
        <div
          className="flex w-14 shrink-0 flex-col items-center rounded-md border border-border/50 bg-muted/30 px-1.5 py-1.5 text-center"
          aria-hidden
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {dateParts.weekday}
          </span>
          <span className="text-xl font-semibold tabular-nums leading-none">
            {dateParts.day}
          </span>
          <span className="text-[10px] capitalize text-muted-foreground">
            {dateParts.month}
          </span>
        </div>
      ) : (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          —
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span className="shrink-0 font-medium text-foreground">{activity.name}</span>
        {typeLabel ? (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {typeLabel}
          </Badge>
        ) : null}

        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />

        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          {dateRangeLabel &&
          activity.activity_end_date &&
          activity.activity_end_date !== dateKey ? (
            <MetaItem icon={Clock} className="hidden shrink-0 md:inline-flex">
              {dateRangeLabel}
            </MetaItem>
          ) : null}
          {activity.activity_time ? (
            <MetaItem icon={Clock} className="shrink-0">
              {activity.activity_time}
            </MetaItem>
          ) : null}
          {activity.club_name ? (
            <MetaItem icon={Building2} className="hidden shrink-0 sm:inline-flex">
              {activity.club_name}
            </MetaItem>
          ) : null}
          {activity.activity_place ? (
            <MetaItem icon={MapPin} className="min-w-0">
              {activity.activity_place}
            </MetaItem>
          ) : null}
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

export function ActivitiesDateList({
  activities,
  detailPath,
}: ActivitiesDateListProps) {
  const t = useTranslations("activities.calendar");

  const sortedActivities = useMemo(
    () => sortActivitiesByTime(activities),
    [activities],
  );

  if (sortedActivities.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <h2 className="text-sm font-medium">{t("listTitle")}</h2>
        <p className="mt-4 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {t("listEmpty")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">{t("listTitle")}</h2>
      </div>
      <ul className="space-y-2 p-3">
        {sortedActivities.map((activity) => (
          <li key={activity.activity_id}>
            <ActivityListCard
              activity={activity}
              href={detailPath(activity.activity_id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
