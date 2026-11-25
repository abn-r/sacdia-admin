"use client";

import { useTranslations } from "next-intl";
import { ProgressBar } from "@/components/annual-rankings/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFormatDate, useFormatNumber } from "@/lib/format-locale";
import type {
  AnnualRankingComponentProgress,
  AnnualRankingPendingItem,
  AnnualRankingSectionProgress,
} from "@/lib/api/annual-rankings";
import { breakdownComponents, pendingKind } from "@/lib/progress/annual";

function ComponentRow({ component }: { component: AnnualRankingComponentProgress }) {
  const t = useTranslations("evaluation.progress.annual.breakdown");
  const formatNumber = useFormatNumber();
  return (
    <li className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-0 text-sm sm:w-56 sm:shrink-0">{component.label}</span>
      <ProgressBar value={component.progress_percentage} label={component.label} className="sm:flex-1" />
      <span className="text-[13px] tabular-nums text-muted-foreground sm:w-32 sm:shrink-0 sm:text-right">
        {t("pointsOf", {
          earned: formatNumber(component.earned_points),
          max: formatNumber(component.max_points),
        })}
      </span>
    </li>
  );
}

function PendingRow({ item }: { item: AnnualRankingPendingItem }) {
  const t = useTranslations("evaluation.progress.annual.breakdown");
  const formatDate = useFormatDate();
  const kind = pendingKind(item.status);
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <span className="min-w-0">
        {item.title}
        {item.due_date ? (
          <span className="block text-xs text-muted-foreground">
            {t("dueDate", { date: formatDate(item.due_date, { day: "numeric", month: "short" }) })}
          </span>
        ) : null}
      </span>
      {kind === "unsent" ? (
        <span className="shrink-0 text-muted-foreground">{t(`pending.${kind}`)}</span>
      ) : (
        <StatusBadge intent="warning" label={t(`pending.${kind}`)} />
      )}
    </li>
  );
}

/** Breakdown of one club: a row per component and what is still pending in the folder. */
export function AnnualRankingBreakdownView({ data }: { data: AnnualRankingSectionProgress }) {
  const t = useTranslations("evaluation.progress.annual.breakdown");
  const components = breakdownComponents(data);

  return (
    <div className="space-y-8">
      <section aria-labelledby="progress-components" className="space-y-3">
        <h2 id="progress-components" className="text-base font-semibold tracking-tight">
          {t("componentsTitle")}
        </h2>
        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("componentsEmpty")}</p>
        ) : (
          <ul className="divide-y rounded-xl bg-card px-4 shadow-card">
            {components.map((component) => (
              <ComponentRow key={component.key} component={component} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="progress-pending" className="space-y-3">
        <h2 id="progress-pending" className="text-base font-semibold tracking-tight">
          {t("pendingTitle")}
        </h2>
        {data.pending_items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("pendingEmpty")}</p>
        ) : (
          <ul className="divide-y rounded-xl bg-card px-4 shadow-card">
            {data.pending_items.map((item, index) => (
              <PendingRow key={`${item.type}-${item.title}-${index}`} item={item} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
