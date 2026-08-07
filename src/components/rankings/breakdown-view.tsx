"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankingScoreBadge } from "@/components/rankings/ranking-score-badge";
import type {
  RankingBreakdown,
  RankingBreakdownCamporeeEvent,
} from "@/lib/api/annual-folders";

// ─── Sub-components ───────────────────────────────────────────────────────────

function WeightsCard({
  weights,
}: {
  weights: RankingBreakdown["weights_applied"];
}) {
  const t = useTranslations("rankings.breakdown");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("weightsApplied")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div className="text-muted-foreground">
          {t("weightsSource")}:{" "}
          <span className="text-foreground font-medium">
            {weights.source === "default"
              ? t("weightsSourceDefault")
              : t("weightsSourceOverride")}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>{t("componentFolder")}: {weights.folder}%</span>
          <span>{t("componentFinance")}: {weights.finance}%</span>
          <span>{t("componentCamporee")}: {weights.camporee}%</span>
          <span>{t("componentEvidence")}: {weights.evidence}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CamporeeEventList({
  events,
}: {
  events: RankingBreakdownCamporeeEvent[];
}) {
  if (events.length === 0) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
      {events.map((e) => (
        <li key={e.id} className="flex items-center gap-1.5">
          <span
            className={
              e.status === "approved" ? "text-success" : "text-muted-foreground"
            }
          >
            {e.status === "approved" ? "✓" : "—"}
          </span>
          {e.name}
        </li>
      ))}
    </ul>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: RankingBreakdown;
}

export function BreakdownView({ data }: Props) {
  const t = useTranslations("rankings.breakdown");
  const { components: c, weights_applied } = data;

  return (
    <div className="space-y-6">
      {/* Composite header */}
      <div className="flex items-center gap-3">
        <RankingScoreBadge value={data.composite_score_pct} className="text-lg px-3 py-1" />
        <span className="text-sm text-muted-foreground">
          {t("compositeScore")}
        </span>
      </div>

      {/* Four component cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Carpetas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("componentFolder")}
              <RankingScoreBadge value={c.folder.score_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              {t("pointsOf", { earned: c.folder.earned_points, max: c.folder.max_points })}
            </div>
            <div className="text-muted-foreground">
              {t("sectionsEvaluated", { count: c.folder.sections_evaluated })}
            </div>
          </CardContent>
        </Card>

        {/* Finanzas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("componentFinance")}
              <RankingScoreBadge value={c.finance.score_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              {t("monthsClosedOnTime", { closed: c.finance.months_closed_on_time, total: c.finance.months_total })}
            </div>
            <div className="text-muted-foreground">
              {t("deadlineDay", { day: c.finance.deadline_day })}
            </div>
            {c.finance.missed_months.length > 0 && (
              <div className="text-destructive text-xs">
                {t("missedMonths", { months: c.finance.missed_months.join(", ") })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Camporees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("componentCamporee")}
              <RankingScoreBadge value={c.camporee.score_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div>
              {t("camporeeEventsOf", { attended: c.camporee.attended, available: c.camporee.available_in_scope })}
            </div>
            <CamporeeEventList events={c.camporee.events} />
          </CardContent>
        </Card>

        {/* Evidencias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t("componentEvidence")}
              <RankingScoreBadge value={c.evidence.score_pct} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              {t("evidenceValidatedRejected", { validated: c.evidence.validated, rejected: c.evidence.rejected })}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("evidencePendingExcluded", { pending: c.evidence.pending_excluded })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weights */}
      <WeightsCard weights={weights_applied} />
    </div>
  );
}
