"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MonthlyBasisNote, ReportMonthlyTextCard } from "@/components/periodic-reports/monthly-data-sections";
import { PeriodicReportActions } from "@/components/periodic-reports/report-actions";
import { PeriodicReportStatusBadge } from "@/components/periodic-reports/report-status-badge";
import {
  ReportFactsCard,
  ReportPeopleCard,
} from "@/components/periodic-reports/report-sections";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  formatReportFinalizerName,
  regenerateQuarterlyReport,
  triggerQuarterlyReportPdfDownload,
  type AdminQuarterlyReport,
} from "@/lib/api/reports";
import { useRoleLabel } from "@/lib/auth/role-labels";
import { useFormatCurrency, useFormatDateTime, useFormatNumber } from "@/lib/format-locale";

const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

interface QuarterlyReportDetailClientProps {
  report: AdminQuarterlyReport;
  /** Global super-admin / admin with reports:update — Recalcular. */
  canRegenerate: boolean;
  /** reports:download */
  canDownload: boolean;
}

export function QuarterlyReportDetailClient({
  report: initialReport,
  canRegenerate,
  canDownload,
}: QuarterlyReportDetailClientProps) {
  const t = useTranslations("periodicReports");
  const roleLabel = useRoleLabel();
  const router = useRouter();
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();
  const formatCurrency = useFormatCurrency();
  const [report, setReport] = useState(initialReport);
  const [downloading, setDownloading] = useState(false);

  const isClosed = report.status === "finalized";
  const computed = report.computed_data ?? null;
  const monthly = computed?.monthly_data ?? null;
  const clubName = report.club?.name ?? t("common.unknownClub");
  const period = t("quarterly.period", { quarter: report.quarter, year: report.year });
  const finalizer = formatReportFinalizerName(report.finalized_by_user);
  const location = [report.club?.churches?.name, report.club?.districts?.name]
    .filter(Boolean)
    .join(" · ");

  // Regenerate answers the bare row (no club relations): keep what we have.
  function applyUpdate(updated: AdminQuarterlyReport) {
    setReport((previous) => ({ ...previous, ...updated, club: previous.club }));
  }

  async function handleRegenerate() {
    try {
      applyUpdate(await regenerateQuarterlyReport(report.quarterly_report_id));
      toast.success(t("common.toasts.regenerated"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.errors.regenerate"));
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await triggerQuarterlyReportPdfDownload(report.quarterly_report_id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.errors.download"));
    } finally {
      setDownloading(false);
    }
  }

  const count = (value: number | null | undefined) =>
    value == null ? null : formatNumber(value);
  const money = (value: number | null | undefined) =>
    value == null ? null : formatCurrency(value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("common.labels.club")}</dt>
            <dd className="font-medium">
              {clubName}
              {location ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">{location}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("common.labels.period")}</dt>
            <dd className="font-medium">{period}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("common.labels.status")}</dt>
            <dd>
              <PeriodicReportStatusBadge status={report.status} size="sm" />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("common.labels.calculated")}</dt>
            <dd className="font-medium">
              {report.auto_generated_at
                ? formatDateTime(report.auto_generated_at, TIMESTAMP_OPTIONS)
                : t("common.notCalculated")}
            </dd>
          </div>
          {isClosed && report.finalized_at ? (
            <div>
              <dt className="text-xs text-muted-foreground">{t("common.labels.finalized")}</dt>
              <dd className="font-medium">
                {formatDateTime(report.finalized_at, TIMESTAMP_OPTIONS)}
                {finalizer ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {t("common.finalizedBy", { name: finalizer })}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>

        <PeriodicReportActions
          canRegenerate={canRegenerate}
          canDownload={canDownload}
          isClosed={isClosed}
          downloading={downloading}
          reportLabel={`${clubName} · ${period}`}
          onRegenerate={handleRegenerate}
          onDownload={handleDownload}
        />
      </div>

      <Alert>
        <AlertDescription>
          {isClosed ? t("common.closedNotice") : t("common.draftNotice")}
        </AlertDescription>
      </Alert>

      <section aria-labelledby="quarterly-computed" className="space-y-4">
        <h2 id="quarterly-computed" className="text-lg font-semibold tracking-tight">
          {t("common.sections.computed")}
        </h2>
        {computed ? (
          <>
            <ReportFactsCard
              title={t("common.computed.summaryTitle")}
              description={t("common.computed.summaryDescription")}
              facts={[
                { label: t("common.computed.members"), value: count(computed.member_count) },
                { label: t("common.computed.activities"), value: count(computed.activities?.total) },
                { label: t("common.computed.honorsStarted"), value: count(computed.honors?.started) },
                { label: t("common.computed.honorsCompleted"), value: count(computed.honors?.completed) },
              ]}
            />
            <ReportFactsCard
              title={t("common.computed.financesTitle")}
              facts={[
                { label: t("common.computed.income"), value: money(computed.finances?.income) },
                { label: t("common.computed.expenses"), value: money(computed.finances?.expenses) },
                { label: t("common.computed.balance"), value: money(computed.finances?.balance) },
                { label: t("common.computed.totalBalance"), value: money(computed.finances?.total_balance) },
                { label: t("common.computed.transactions"), value: count(computed.finances?.transactions) },
              ]}
            />
            <ReportPeopleCard
              title={t("common.computed.directiva")}
              emptyLabel={t("common.computed.directivaEmpty")}
              people={(computed.directiva ?? []).map((member, index) => ({
                key: `${member.user_id ?? "member"}-${index}`,
                primary: member.name ?? "—",
                secondary: member.role ? roleLabel(member.role) : undefined,
              }))}
            />
          </>
        ) : (
          <EmptyState icon={Inbox} title={t("common.computed.empty")} />
        )}
      </section>

      <section aria-labelledby="quarterly-monthly" className="space-y-4">
        <h2 id="quarterly-monthly" className="text-lg font-semibold tracking-tight">
          {t("common.sections.monthly")}
        </h2>
        <MonthlyBasisNote monthsSubmitted={monthly?.months_submitted} />
        <ReportFactsCard
          title={t("quarterly.monthly.sectionMeetings")}
          facts={[
            { label: t("quarterly.monthly.planningMeetings"), value: count(monthly?.planning_meetings) },
            { label: t("quarterly.monthly.parentMeetings"), value: count(monthly?.parent_meetings) },
            { label: t("quarterly.monthly.youthCouncilAttendance"), value: count(monthly?.youth_council_attendance) },
            { label: t("quarterly.monthly.churchBoardAttendance"), value: count(monthly?.church_board_attendance) },
          ]}
        />
        <ReportFactsCard
          title={t("quarterly.monthly.sectionMissionary")}
          facts={[
            { label: t("quarterly.monthly.soulTarget"), value: count(monthly?.soul_target) },
            { label: t("quarterly.monthly.baptizedThisQuarter"), value: count(monthly?.baptized_this_quarter) },
            { label: t("quarterly.monthly.camporeesAttended"), value: count(monthly?.camporees_attended) },
            {
              label: t("quarterly.monthly.certificatesDelivered"),
              value:
                    monthly?.certificates_delivered == null
                      ? null
                      : monthly.certificates_delivered
                        ? t("common.yes")
                        : t("common.no"),
            },
          ]}
        />
        <ReportMonthlyTextCard
          title={t("quarterly.monthly.sectionNarrative")}
          entries={[
            { label: t("quarterly.monthly.clubParticipation"), items: monthly?.club_participation_description },
            { label: t("quarterly.monthly.communityService"), items: monthly?.community_service_description },
          ]}
        />
      </section>
    </div>
  );
}
