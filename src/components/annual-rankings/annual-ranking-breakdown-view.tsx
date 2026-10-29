"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useFormatNumber } from "@/lib/format-locale";
import type {
  AnnualRankingAxisProgress,
  AnnualRankingComponentProgress,
  AnnualRankingPendingItem,
  AnnualRankingSectionProgress,
} from "@/lib/api/annual-rankings";

const PENDING_STATUS_KEYS = {
  pending_delivery: "pendingStatus.pending_delivery",
  pending_validation: "pendingStatus.pending_validation",
  pending_union_validation: "pendingStatus.pending_union_validation",
  pending_review: "pendingStatus.pending_review",
} as const;

function pendingStatusKey(status: string) {
  return status in PENDING_STATUS_KEYS
    ? PENDING_STATUS_KEYS[status as keyof typeof PENDING_STATUS_KEYS]
    : PENDING_STATUS_KEYS.pending_review;
}

function ComponentRow({ component }: { component: AnnualRankingComponentProgress }) {
  const formatNumber = useFormatNumber();
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0">{component.label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">
            {formatNumber(component.earned_points)}
          </span>
          /{formatNumber(component.max_points)}
        </span>
      </div>
      <Progress value={component.progress_percentage} aria-label={component.label} />
    </li>
  );
}

function AxisCard({ axis }: { axis: AnnualRankingAxisProgress }) {
  const t = useTranslations("annual_folders.pageRankingsBreakdown");
  const formatNumber = useFormatNumber();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-3 text-base">
          <span>{axis.label}</span>
          <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
            {t("pointsOf", {
              earned: formatNumber(axis.earned_points),
              max: formatNumber(axis.max_points),
            })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {axis.components.map((component) => (
            <ComponentRow key={component.key} component={component} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PendingItems({ items }: { items: AnnualRankingPendingItem[] }) {
  const t = useTranslations("annual_folders.pageRankingsBreakdown");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("pendingTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("pendingEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item, index) => (
              <li
                key={`${item.type}-${item.title}-${index}`}
                className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
              >
                <span className="min-w-0">{item.title}</span>
                <Badge variant="outline" className="shrink-0">
                  {t(pendingStatusKey(item.status))}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AnnualRankingBreakdownView({ data }: { data: AnnualRankingSectionProgress }) {
  const t = useTranslations("annual_folders.pageRankingsBreakdown");
  const formatNumber = useFormatNumber();

  // Configs without axes list their components flat; show them as one group.
  const axes: AnnualRankingAxisProgress[] =
    data.axes.length > 0
      ? data.axes
      : [
          {
            key: "components",
            label: t("componentsTitle"),
            earned_points: data.current_points,
            max_points: data.max_points,
            progress_percentage: data.progress_percentage,
            components: data.components,
          },
        ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-6 pt-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("totalLabel")}</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatNumber(data.current_points)}
              <span className="text-lg font-normal text-muted-foreground">
                /{formatNumber(data.max_points)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {t("progress", { percent: formatNumber(data.progress_percentage) })}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-sm text-muted-foreground">{t("tierLabel")}</p>
            <Badge variant={data.current_tier ? "secondary" : "outline"} className="text-sm">
              {data.current_tier?.name ?? t("noTier")}
            </Badge>
            {data.next_tier?.points_to_reach ? (
              <p className="text-sm text-muted-foreground">
                {t("nextTier", {
                  points: formatNumber(data.next_tier.points_to_reach),
                  tier: data.next_tier.name,
                })}
              </p>
            ) : null}
          </div>
          <Progress
            value={data.progress_percentage}
            aria-label={t("totalLabel")}
            className="basis-full"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {axes.map((axis) => (
          <AxisCard key={axis.key} axis={axis} />
        ))}
      </div>

      <PendingItems items={data.pending_items} />
    </div>
  );
}
