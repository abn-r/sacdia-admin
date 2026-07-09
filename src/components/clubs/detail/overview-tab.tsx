"use client";

import { Loader2, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Unit } from "@/lib/api/units";
import type { ClubOverview, ClubLeadership } from "@/lib/api/club-detail";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorRetryBanner } from "@/components/shared/error-retry-banner";
import { CompositionDonut } from "./composition-donut";
import { AttendanceChart, ScoreBreakdown, ScoreCircle } from "./charts";
import { SectionMembersRoster } from "./section-members-roster";
import { ClubHubTeamSection } from "./hub-sections";
import { getTotalMembers } from "./helpers";
import type { SectionView } from "./types";

interface OverviewTabProps {
  sections: SectionView[];
  units: Unit[];
  overview: ClubOverview | undefined;
  isLoadingOverview: boolean;
  overviewError: Error | null;
  leadership?: ClubLeadership;
  isLoadingLeadership?: boolean;
  leadershipError?: Error | null;
  onRetryOverview?: () => void;
  onRetryLeadership?: () => void;
  isRetryingOverview?: boolean;
  isRetryingLeadership?: boolean;
  teamSections: Array<{
    sectionId: number;
    typeName: string;
    memberCount: number;
    active: boolean;
  }>;
  onOpenResponsables: (sectionId: number) => void;
  onOpenSections: () => void;
}

export function ClubOverviewTab({
  sections,
  units,
  overview,
  isLoadingOverview,
  overviewError,
  leadership,
  teamSections,
  onOpenResponsables,
  onOpenSections,
  onRetryOverview,
  isRetryingOverview = false,
}: OverviewTabProps) {
  const t = useTranslations("clubs.detail.overview");
  const tErrors = useTranslations("shared.errorRetry");
  const total = getTotalMembers(sections);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-12">
          <CardHeader>
            <CardTitle className="font-normal">{t("attendanceTitle")}</CardTitle>
            <CardDescription>{t("attendanceSubtitle")}</CardDescription>
            {overview?.attendance_average != null ? (
              <p className="text-sm text-muted-foreground">
                {t("attendanceAverage", {
                  pct: Math.round(overview.attendance_average),
                })}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            <AttendanceBlock
              overview={overview}
              isLoading={isLoadingOverview}
              error={overviewError}
              onRetry={onRetryOverview}
              isRetrying={isRetryingOverview}
              errorMessage={tErrors("loadAttendance")}
              emptyTitle={t("attendanceEmptyTitle")}
              emptyDescription={t("attendanceEmptyDescription")}
              loadingLabel={t("loading")}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">{t("healthTitle")}</CardTitle>
            <CardDescription>{t("healthSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <HealthBlock
              overview={overview}
              isLoading={isLoadingOverview}
              error={overviewError}
              onRetry={onRetryOverview}
              isRetrying={isRetryingOverview}
              errorMessage={tErrors("loadClubScore")}
              loadingLabel={t("loading")}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader>
            <CardTitle className="font-normal">{t("compositionTitle")}</CardTitle>
            <CardDescription>
              {t("compositionSubtitle")} · {t("totalCount", { count: total })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompositionDonut sections={sections} total={total} />
          </CardContent>
        </Card>
      </div>

      <SectionMembersRoster
        sections={sections}
        units={units}
        leadership={leadership}
      />

      <ClubHubTeamSection
        sections={teamSections}
        onOpenResponsables={onOpenResponsables}
        onOpenSections={onOpenSections}
      />
    </div>
  );
}

function HealthBlock({
  overview,
  isLoading,
  error,
  onRetry,
  isRetrying,
  errorMessage,
  loadingLabel,
}: {
  overview: ClubOverview | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  errorMessage: string;
  loadingLabel: string;
}) {
  const t = useTranslations("clubs.detail.overview");

  if (isLoading) return <CardLoader label={loadingLabel} />;
  if (error || !overview) {
    return (
      <ErrorRetryBanner
        message={errorMessage}
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    );
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[96px_1fr] items-center gap-4">
        <ScoreCircle score={overview.score} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("healthScoreDescription", { grade: overview.score.grade })}
        </p>
      </div>
      <ScoreBreakdown items={overview.score.breakdown} />
    </div>
  );
}

function AttendanceBlock({
  overview,
  isLoading,
  error,
  onRetry,
  isRetrying,
  errorMessage,
  emptyTitle,
  emptyDescription,
  loadingLabel,
}: {
  overview: ClubOverview | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  errorMessage: string;
  emptyTitle: string;
  emptyDescription: string;
  loadingLabel: string;
}) {
  if (isLoading) return <CardLoader label={loadingLabel} />;
  if (error) {
    return (
      <ErrorRetryBanner
        message={errorMessage}
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    );
  }
  if (!overview?.attendance || overview.attendance.length === 0) {
    return (
      <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-10 text-center">
        <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
          <TrendingUp className="size-5" />
        </span>
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }
  return <AttendanceChart series={overview.attendance} />;
}

function CardLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}
