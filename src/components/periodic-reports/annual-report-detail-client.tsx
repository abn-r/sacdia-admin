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
  ecclesiasticalYearLabel,
  formatReportFinalizerName,
  regenerateAnnualReport,
  triggerAnnualReportPdfDownload,
  type AdminAnnualReport,
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

interface AnnualReportDetailClientProps {
  report: AdminAnnualReport;
  /** Global super-admin / admin with reports:update — Recalcular. */
  canRegenerate: boolean;
  /** reports:download */
  canDownload: boolean;
}

export function AnnualReportDetailClient({
  report: initialReport,
  canRegenerate,
  canDownload,
}: AnnualReportDetailClientProps) {
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
  const period =
    ecclesiasticalYearLabel(report.ecclesiastical_year) ?? computed?.year_label ?? "—";
  const finalizer = formatReportFinalizerName(report.finalized_by_user);
  const location = [report.club?.churches?.name, report.club?.districts?.name]
    .filter(Boolean)
    .join(" · ");

  // Regenerate answers the bare row (no relations): keep what we have.
  function applyUpdate(updated: AdminAnnualReport) {
    setReport((previous) => ({
      ...previous,
      ...updated,
      club: previous.club,
      ecclesiastical_year: previous.ecclesiastical_year,
    }));
  }

  async function handleRegenerate() {
    try {
      applyUpdate(await regenerateAnnualReport(report.annual_report_id));
      toast.success(t("common.toasts.regenerated"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.errors.regenerate"));
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await triggerAnnualReportPdfDownload(report.annual_report_id);
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
            <dt className="text-xs text-muted-foreground">{t("annual.labels.ecclesiasticalYear")}</dt>
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

      <section aria-labelledby="annual-computed" className="space-y-4">
        <h2 id="annual-computed" className="text-lg font-semibold tracking-tight">
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
                { label: t("annual.computed.monthsReported"), value: count(computed.months_reported) },
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
            <ReportPeopleCard
              title={t("annual.computed.topAchievers")}
              emptyLabel={t("annual.computed.topAchieversEmpty")}
              people={(computed.top_achievers ?? []).map((person, index) => ({
                key: `${person.user_id ?? "achiever"}-${index}`,
                primary: person.name ?? "—",
                secondary:
                  person.honors_count == null
                    ? undefined
                    : t("annual.computed.honorsCount", { count: person.honors_count }),
              }))}
            />
          </>
        ) : (
          <EmptyState icon={Inbox} title={t("common.computed.empty")} />
        )}
      </section>

      <section aria-labelledby="annual-monthly" className="space-y-4">
        <h2 id="annual-monthly" className="text-lg font-semibold tracking-tight">
          {t("common.sections.monthly")}
        </h2>
        <MonthlyBasisNote monthsSubmitted={monthly?.months_submitted} />
        <ReportFactsCard
          title={t("annual.monthly.sectionMeetings")}
          facts={[
            { label: t("annual.monthly.planningMeetings"), value: count(monthly?.planning_meetings) },
            { label: t("annual.monthly.parentMeetings"), value: count(monthly?.parent_meetings) },
            { label: t("annual.monthly.camporeesAttended"), value: count(monthly?.camporees_attended) },
          ]}
        />
        <ReportFactsCard
          title={t("annual.monthly.sectionMissionary")}
          facts={[
            { label: t("annual.monthly.baptizedThisYear"), value: count(monthly?.baptized_this_year) },
            { label: t("annual.monthly.totalBaptized"), value: count(monthly?.total_baptized) },
            {
              label: t("annual.monthly.allInvestituresCompleted"),
              value:
                    monthly?.all_investitures_completed == null
                      ? null
                      : monthly.all_investitures_completed
                        ? t("common.yes")
                        : t("common.no"),
            },
          ]}
        />
        <ReportMonthlyTextCard
          title={t("annual.monthly.sectionNarrative")}
          entries={[
            { label: t("annual.monthly.achievements"), items: monthly?.annual_achievements_description },
            { label: t("annual.monthly.communityService"), items: monthly?.community_service_description },
          ]}
        />
      </section>
    </div>
  );
}
