"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cancelFutureActivitySeries } from "@/lib/api/activities";
import type { Activity, ActivitySeriesSummary } from "@/lib/api/activities";
import { activityDetailPath } from "@/lib/activities/helpers";
import { activityPhase, formatDayLabel } from "@/lib/activities/view";
import { formatCalendarDate } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

type WeekdayKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** "Cada miércoles" / "Cada 3 días", in the panel language. */
export function useSeriesRuleText(series: ActivitySeriesSummary): string {
  const t = useTranslations("people.activities.series");
  const tOld = useTranslations("activities.series");
  const locale = useLocale();
  if (series.kind === "weekly" && series.weekdays?.[0]) {
    const weekday = tOld(`weekdays.${series.weekdays[0] as WeekdayKey}`).toLocaleLowerCase(locale);
    return t("ruleWeekly", { weekday });
  }
  if (series.kind === "interval" && series.interval_days) {
    return t("ruleInterval", { days: series.interval_days });
  }
  return tOld("badge");
}

/**
 * The series a session belongs to: its rule, how many sessions, and a sheet
 * with all of them. Cancelling the upcoming ones is the only bulk action the
 * API offers.
 */
export function ActivitySeriesPanel({
  series,
  sessions,
  sessionsFailed,
  currentActivityId,
  today,
  canEdit,
}: {
  series: ActivitySeriesSummary;
  sessions: Activity[];
  sessionsFailed: boolean;
  currentActivityId: number;
  today: string;
  canEdit: boolean;
}) {
  const t = useTranslations("people.activities.series");
  const tOld = useTranslations("activities.series");
  const locale = useLocale();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ruleText = useSeriesRuleText(series);
  const until = formatCalendarDate(series.until_date, locale, "long");
  const upcoming = series.counts?.upcoming ?? 0;

  return (
    <>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {t("summary", { rule: ruleText, date: until, count: series.counts?.total ?? sessions.length })}
        </span>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="link" size="xs" className="h-auto p-0">
              <Repeat aria-hidden />
              {tOld("viewSeries")}
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
            <SheetHeader className="border-b px-6 py-5">
              <SheetTitle>{series.name}</SheetTitle>
              <SheetDescription>
                {t("summary", { rule: ruleText, date: until, count: series.counts?.total ?? sessions.length })}
                {series.counts ? ` · ${tOld("countsLine", { upcoming: series.counts.upcoming, total: series.counts.total })}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {sessionsFailed ? (
                <p role="alert" className="text-sm text-destructive">
                  {t("sessionsError")}
                </p>
              ) : (
                <ul className="divide-y" aria-label={t("sessions")}>
                  {sessions.map((session) => {
                    const past = activityPhase(session, today) === "past";
                    const current = session.activity_id === currentActivityId;
                    return (
                      <li key={session.activity_id} className="py-2.5">
                        <Link
                          href={activityDetailPath(session.activity_id)}
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "flex items-baseline justify-between gap-3 rounded-sm text-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            past && "text-muted-foreground",
                            current && "font-semibold",
                          )}
                        >
                          <span className="tabular-nums">
                            {session.activity_date ? formatDayLabel(session.activity_date, locale) : "—"}
                            {session.activity_time ? ` · ${session.activity_time}` : ""}
                          </span>
                          {current ? <span className="text-xs font-normal text-muted-foreground">{t("thisSession")}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {canEdit && upcoming > 0 ? (
              <div className="border-t px-6 py-4">
                <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                  {tOld("cancelFuture")}
                </Button>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>
      </span>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tone="destructive"
        title={tOld("cancelFutureConfirmTitle")}
        description={t("cancelFutureBody", { count: upcoming })}
        confirmLabel={tOld("cancelFutureAction")}
        onConfirm={async () => {
          const result = await cancelFutureActivitySeries(series.activity_series_id);
          toast.success(tOld("canceled", { count: result.canceled_count }));
          router.refresh();
        }}
      />
    </>
  );
}
