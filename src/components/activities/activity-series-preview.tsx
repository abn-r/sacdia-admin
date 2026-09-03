"use client";

import { Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ActivitySeriesPreview } from "@/lib/api/activities";

export function ActivitySeriesPreviewList({
  preview,
  isLoading,
  error,
}: {
  preview: ActivitySeriesPreview | null;
  isLoading?: boolean;
  error?: boolean;
}) {
  const t = useTranslations("activities.series");

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{t("previewLoading")}</p>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{t("previewError")}</p>;
  }

  if (!preview) {
    return null;
  }

  const first = preview.dates[0];
  const last = preview.dates[preview.dates.length - 1];
  const middle = preview.dates.slice(1, -1);
  const visibleMiddle = middle.slice(0, 6);
  const remaining = middle.length - visibleMiddle.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Repeat className="size-3.5 text-success" aria-hidden />
        <p className="text-sm font-medium">{t("previewTitle", { count: preview.count })}</p>
        <Badge variant="soft-success">{t("untilLabel", { date: preview.until })}</Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {first ? (
          <span className="rounded-md bg-success/15 px-2 py-1 font-mono text-[11px] font-medium text-success">
            {first}
          </span>
        ) : null}
        {visibleMiddle.map((date) => (
          <span
            key={date}
            className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground"
          >
            {date}
          </span>
        ))}
        {remaining > 0 ? (
          <span className="rounded-md px-2 py-1 text-[11px] text-muted-foreground">
            {t("previewMore", { count: remaining })}
          </span>
        ) : null}
        {last && last !== first ? (
          <span className="rounded-md bg-success/15 px-2 py-1 font-mono text-[11px] font-medium text-success">
            {last}
          </span>
        ) : null}
      </div>
    </div>
  );
}
