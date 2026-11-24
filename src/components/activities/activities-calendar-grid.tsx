"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Repeat } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DataTableShell } from "@/components/shared/data-table-shell";
import type { Activity } from "@/lib/api/activities";
import { getMonthGridDays, getWeekDays, toDateKey } from "@/lib/activities/helpers";
import { activityPhase, formatDayLabel, formatWeekdayShort, weekdayLabels } from "@/lib/activities/view";
import { cn } from "@/lib/utils";

interface ActivitiesCalendarGridProps {
  view: "month" | "week";
  anchor: Date;
  activitiesByDate: Map<string, Activity[]>;
  /** Today in the panel zone (`YYYY-MM-DD`), computed on the server. */
  today: string;
  /** Opens the week of that day. */
  onSelectDate: (date: Date) => void;
  detailPath: (activityId: number) => string;
}

const MONTH_CHIPS = 3;
const WEEK_CHIPS = 6;

/** One activity in a day cell. Past ones are muted; today's day number carries the accent. */
function ActivityChip({
  activity,
  href,
  today,
}: {
  activity: Activity;
  href: string;
  today: string;
}) {
  const past = activityPhase(activity, today) === "past";
  return (
    <Link
      href={href}
      data-phase={past ? "past" : "current"}
      className={cn(
        "flex min-w-0 items-baseline gap-1.5 rounded-md px-1.5 py-1 text-left text-xs outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
        past
          ? "bg-muted/40 text-muted-foreground hover:bg-muted/70"
          : "bg-primary/10 text-foreground hover:bg-primary/15",
      )}
    >
      {activity.activity_time ? (
        <small className="shrink-0 text-2xs tabular-nums text-muted-foreground">{activity.activity_time}</small>
      ) : null}
      <span className="truncate font-medium">{activity.name}</span>
      {activity.activity_series_id ? <Repeat className="size-3 shrink-0 self-center" aria-hidden /> : null}
    </Link>
  );
}

export function ActivitiesCalendarGrid({
  view,
  anchor,
  activitiesByDate,
  today,
  onSelectDate,
  detailPath,
}: ActivitiesCalendarGridProps) {
  const t = useTranslations("activities.calendar");
  const locale = useLocale();
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);

  if (view === "week") {
    const days = getWeekDays(anchor);
    return (
      <DataTableShell>
        <div className="grid grid-cols-1 divide-y md:grid-cols-7 md:divide-x md:divide-y-0">
          {days.map((date) => {
            const key = toDateKey(date);
            const dayActivities = activitiesByDate.get(key) ?? [];
            const isToday = key === today;
            return (
              <div key={key} className="min-h-24 p-2 md:min-h-[320px]">
                <button
                  type="button"
                  onClick={() => onSelectDate(date)}
                  aria-label={formatDayLabel(key, locale)}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "mb-2 flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 md:flex-col md:gap-0",
                    isToday && "bg-primary/10",
                  )}
                >
                  <span className="text-2xs capitalize text-muted-foreground">{formatWeekdayShort(date, locale)}</span>
                  <span className="text-lg font-semibold tabular-nums">{date.getDate()}</span>
                </button>
                <div className="space-y-1">
                  {dayActivities.slice(0, WEEK_CHIPS).map((activity) => (
                    <ActivityChip
                      key={activity.activity_id}
                      activity={activity}
                      href={detailPath(activity.activity_id)}
                      today={today}
                    />
                  ))}
                  {dayActivities.length > WEEK_CHIPS ? (
                    <p className="px-1.5 text-xs text-muted-foreground">
                      {t("moreCount", { count: dayActivities.length - WEEK_CHIPS })}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </DataTableShell>
    );
  }

  const monthDays = getMonthGridDays(anchor);
  const monthIndex = anchor.getMonth();

  return (
    <DataTableShell>
      <div className="grid grid-cols-7 border-b">
        {weekdays.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-medium capitalize text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y">
        {monthDays.map((date) => {
          const key = toDateKey(date);
          const dayActivities = activitiesByDate.get(key) ?? [];
          const inMonth = date.getMonth() === monthIndex;
          const isToday = key === today;
          return (
            <div
              key={key}
              className={cn("min-h-20 min-w-0 p-1 sm:min-h-[120px] sm:p-2", !inMonth && "bg-muted/20 text-muted-foreground")}
            >
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                aria-label={formatDayLabel(key, locale)}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "mb-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-medium tabular-nums outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:mb-2",
                  isToday && "bg-primary-solid text-primary-foreground hover:bg-primary/90",
                )}
              >
                {date.getDate()}
              </button>
              <div className="space-y-1">
                {dayActivities.slice(0, MONTH_CHIPS).map((activity) => (
                  <ActivityChip
                    key={activity.activity_id}
                    activity={activity}
                    href={detailPath(activity.activity_id)}
                    today={today}
                  />
                ))}
                {dayActivities.length > MONTH_CHIPS ? (
                  <button
                    type="button"
                    onClick={() => onSelectDate(date)}
                    className="px-1.5 text-2xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {t("moreCount", { count: dayActivities.length - MONTH_CHIPS })}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </DataTableShell>
  );
}
