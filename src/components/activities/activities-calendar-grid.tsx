"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/api/activities";
import { ACTIVITY_TYPE_LABELS } from "@/lib/api/activities";
import {
  getMonthGridDays,
  getWeekDays,
  toDateKey,
} from "@/lib/activities/helpers";
import type { CalendarViewMode } from "@/components/activities/activities-calendar-client";

interface ActivitiesCalendarGridProps {
  view: CalendarViewMode;
  anchor: Date;
  activitiesByDate: Map<string, Activity[]>;
  onSelectDate: (date: Date) => void;
  detailPath: (activityId: number) => string;
}

function ActivityChip({
  activity,
  href,
  compact = false,
}: {
  activity: Activity;
  href: string;
  compact?: boolean;
}) {
  const typeLabel =
    activity.activity_type?.name ??
    ACTIVITY_TYPE_LABELS[activity.activity_type_id] ??
    "";

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md border border-border/60 bg-background px-2 py-1 text-left transition-colors hover:bg-muted/50",
        compact ? "truncate text-[11px]" : "text-sm",
      )}
    >
      <div className="truncate font-medium">
        {activity.activity_series_id ? (
          <Repeat className="mr-1 inline size-3 text-success" aria-hidden />
        ) : null}
        {activity.name}
      </div>
      {!compact ? (
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {activity.activity_time ? <span>{activity.activity_time}</span> : null}
          {activity.club_name ? <span>· {activity.club_name}</span> : null}
          {typeLabel ? (
            <Badge variant="secondary" className="text-[10px]">
              {typeLabel}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}

function DayActivitiesList({
  dateKey,
  activities,
  detailPath,
}: {
  dateKey: string;
  activities: Activity[];
  detailPath: (activityId: number) => string;
}) {
  const t = useTranslations("activities.calendar");

  if (activities.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("emptyDay")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <ActivityChip
          key={`${dateKey}-${activity.activity_id}`}
          activity={activity}
          href={detailPath(activity.activity_id)}
        />
      ))}
    </div>
  );
}

export function ActivitiesCalendarGrid({
  view,
  anchor,
  activitiesByDate,
  onSelectDate,
  detailPath,
}: ActivitiesCalendarGridProps) {
  const t = useTranslations("activities.calendar");
  const weekDayLabels = useMemo(
    () =>
      getWeekDays(new Date()).map((date) =>
        date.toLocaleDateString("es-MX", { weekday: "short" }),
      ),
    [],
  );

  if (view === "day") {
    const dateKey = toDateKey(anchor);
    const dayActivities = activitiesByDate.get(dateKey) ?? [];
    return (
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <DayActivitiesList
          dateKey={dateKey}
          activities={dayActivities}
          detailPath={detailPath}
        />
      </div>
    );
  }

  if (view === "week") {
    const days = getWeekDays(anchor);
    return (
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <div className="grid min-w-[960px] grid-cols-7 divide-x">
          {days.map((date) => {
            const dateKey = toDateKey(date);
            const dayActivities = activitiesByDate.get(dateKey) ?? [];
            const isToday = dateKey === toDateKey(new Date());
            return (
              <div key={dateKey} className="min-h-[320px] p-2">
                <button
                  type="button"
                  onClick={() => onSelectDate(date)}
                  className={cn(
                    "mb-2 flex w-full flex-col items-start rounded-md px-2 py-1 text-left hover:bg-muted/40",
                    isToday && "bg-primary/10",
                  )}
                >
                  <span className="text-[11px] uppercase text-muted-foreground">
                    {date.toLocaleDateString("es-MX", { weekday: "short" })}
                  </span>
                  <span className="text-lg font-semibold tabular-nums">{date.getDate()}</span>
                </button>
                <div className="space-y-1.5">
                  {dayActivities.slice(0, 6).map((activity) => (
                    <ActivityChip
                      key={activity.activity_id}
                      activity={activity}
                      href={detailPath(activity.activity_id)}
                      compact
                    />
                  ))}
                  {dayActivities.length > 6 ? (
                    <button
                      type="button"
                      onClick={() => onSelectDate(date)}
                      className="text-xs text-primary hover:underline"
                    >
                      {t("moreCount", { count: dayActivities.length - 6 })}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const monthDays = getMonthGridDays(anchor);
  const monthIndex = anchor.getMonth();

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="grid grid-cols-7 border-b bg-muted/20">
        {weekDayLabels.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y">
        {monthDays.map((date) => {
          const dateKey = toDateKey(date);
          const dayActivities = activitiesByDate.get(dateKey) ?? [];
          const inMonth = date.getMonth() === monthIndex;
          const isToday = dateKey === toDateKey(new Date());
          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[120px] bg-background p-2",
                !inMonth && "bg-muted/10 text-muted-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                className={cn(
                  "mb-2 inline-flex size-7 items-center justify-center rounded-full text-sm font-medium hover:bg-muted/50",
                  isToday && "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {date.getDate()}
              </button>
              <div className="space-y-1">
                {dayActivities.slice(0, 3).map((activity) => (
                  <ActivityChip
                    key={activity.activity_id}
                    activity={activity}
                    href={detailPath(activity.activity_id)}
                    compact
                  />
                ))}
                {dayActivities.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => onSelectDate(date)}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {t("moreCount", { count: dayActivities.length - 3 })}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
