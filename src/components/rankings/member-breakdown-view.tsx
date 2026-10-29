"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankingScoreBadge } from "@/components/rankings/ranking-score-badge";
import { useFormatDateTime } from "@/lib/format-locale";
import type { MemberBreakdown } from "@/lib/api/member-rankings";

const INVESTITURE_STATUS_KEYS = {
  investido: "pageMemberBreakdown.statusInvestido",
  completed: "pageMemberBreakdown.statusCompleted",
  in_progress: "pageMemberBreakdown.statusInProgress",
  pending: "pageMemberBreakdown.statusPending",
  not_started: "pageMemberBreakdown.statusNotStarted",
} as const;

function investitureStatusKey(status: string) {
  const key = status.toLowerCase();
  return key in INVESTITURE_STATUS_KEYS
    ? INVESTITURE_STATUS_KEYS[key as keyof typeof INVESTITURE_STATUS_KEYS]
    : undefined;
}

function ComponentCard({
  title,
  score,
  weight,
  children,
}: {
  title: string;
  score: number | null;
  weight: number;
  children: ReactNode;
}) {
  const t = useTranslations("rankings");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          {title}
          {score !== null && <RankingScoreBadge value={score} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {children}
        <p className="text-xs text-muted-foreground">
          {score === null
            ? t("pageMemberBreakdown.notCounted")
            : t("breakdownCard.weightLabel", { weight })}
        </p>
      </CardContent>
    </Card>
  );
}

export function MemberBreakdownView({ data }: { data: MemberBreakdown }) {
  const t = useTranslations("rankings");
  const formatDateTime = useFormatDateTime();
  const { class_breakdown: cls, investiture_breakdown: inv, camporee_breakdown: cmp, weights } = data;

  const investitureStatus = inv.status ? investitureStatusKey(inv.status) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {data.composite_score_pct !== null ? (
          <RankingScoreBadge value={data.composite_score_pct} className="px-3 py-1 text-lg" />
        ) : (
          <span className="text-lg text-muted-foreground">—</span>
        )}
        <span className="text-sm text-muted-foreground">
          {t("pageMemberBreakdown.compositeScore")}
        </span>
        {data.rank_position !== null && (
          <span className="text-sm text-muted-foreground">
            · {t("pageMemberBreakdown.position")} #{data.rank_position}
          </span>
        )}
        {data.awarded_category?.name && (
          <span className="text-sm text-muted-foreground">
            · {t("pageMemberBreakdown.category")}: {data.awarded_category.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ComponentCard
          title={t("pageMemberBreakdown.titleClass")}
          score={data.class_score_pct}
          weight={weights.class_pct}
        >
          <p>
            {t("pageMemberBreakdown.sectionsCompleted")}{" "}
            <span className="font-medium tabular-nums">
              {cls.completed_sections} / {cls.required_sections}
            </span>
          </p>
          {cls.folder_status && (
            <p className="text-muted-foreground">
              {t("pageMemberBreakdown.folder")} {cls.folder_status}
            </p>
          )}
        </ComponentCard>

        <ComponentCard
          title={t("pageMemberBreakdown.titleInvestiture")}
          score={data.investiture_score_pct}
          weight={weights.investiture_pct}
        >
          <p>
            {t("pageMemberBreakdown.status")}{" "}
            <span className="font-medium">
              {inv.status
                ? investitureStatus
                  ? t(investitureStatus)
                  : inv.status
                : t("pageMemberBreakdown.statusNoRecord")}
            </span>
          </p>
        </ComponentCard>

        <ComponentCard
          title={t("pageMemberBreakdown.titleCamporee")}
          score={data.camporee_score_pct}
          weight={weights.camporee_pct}
        >
          <p>
            {t("pageMemberBreakdown.participation")}{" "}
            <span className="font-medium">
              {cmp.participated ? t("pageMemberBreakdown.yes") : t("pageMemberBreakdown.no")}
            </span>
          </p>
          {cmp.total_camporees !== null && (
            <p className="text-muted-foreground">
              {t("pageMemberBreakdown.availableCamporees")}{" "}
              <span className="tabular-nums">{cmp.total_camporees}</span>
            </p>
          )}
        </ComponentCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pageMemberBreakdown.weightsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="text-muted-foreground">
            {t("breakdown.weightsSource")}:{" "}
            <span className="font-medium text-foreground">
              {weights.source === "default"
                ? t("breakdown.weightsSourceDefault")
                : t("breakdown.weightsSourceOverride")}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {t("pageMemberBreakdown.titleClass")}: {weights.class_pct}%
            </span>
            <span>
              {t("pageMemberBreakdown.titleInvestiture")}: {weights.investiture_pct}%
            </span>
            <span>
              {t("pageMemberBreakdown.titleCamporee")}: {weights.camporee_pct}%
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t("pageMemberBreakdown.lastCalculated")}{" "}
        {data.composite_calculated_at
          ? formatDateTime(data.composite_calculated_at)
          : t("pageMemberBreakdown.lastCalculatedNone")}
      </p>
    </div>
  );
}
