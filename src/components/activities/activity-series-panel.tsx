"use client";

import { useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getActivitySeries } from "@/lib/api/activities";
import type { ActivitySeriesSummary } from "@/lib/api/activities";

export function ActivitySeriesPanel({ seriesId }: { seriesId: number }) {
  const t = useTranslations("activities.series");
  const [series, setSeries] = useState<ActivitySeriesSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getActivitySeries(seriesId)
      .then((result) => {
        if (!cancelled) setSeries(result);
      })
      .catch(() => {
        if (!cancelled) setSeries(null);
      });
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  if (!series) return null;

  const kindLabel =
    series.kind === "weekly" && series.weekdays?.[0]
      ? t(`weekdays.${series.weekdays[0]}`)
      : series.kind === "interval" && series.interval_days
        ? t("everyDays") + `: ${series.interval_days}`
        : series.kind;

  return (
    <Card className="overflow-hidden border-success/25 bg-success/10">
      <CardContent className="flex flex-wrap items-center gap-4 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15">
          <Repeat className="size-5 text-success" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{t("badge")}</p>
            <Badge variant="soft-success">{kindLabel}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("untilLabel", { date: series.until_date })}
            {series.counts
              ? ` · ${t("countsLine", {
                  upcoming: series.counts.upcoming,
                  total: series.counts.total,
                })}`
              : null}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
