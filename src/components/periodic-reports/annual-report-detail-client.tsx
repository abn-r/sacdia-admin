"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AnnualManualDataForm } from "@/components/periodic-reports/annual-manual-data-form";
import { PeriodicReportActions } from "@/components/periodic-reports/report-actions";
import { PeriodicReportStatusBadge } from "@/components/periodic-reports/report-status-badge";
import {
  ReportFactsCard,
  ReportPeopleCard,
  ReportTextCard,
} from "@/components/periodic-reports/report-sections";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ecclesiasticalYearLabel,
  finalizeAnnualReport,
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
  /** reports:update — manual data form and Recalcular. */
  canUpdate: boolean;
  /** reports:update — Finalizar. */
  canFinalize: boolean;
  /** reports:download */
  canDownload: boolean;
}

export function AnnualReportDetailClient({
  report: initialReport,
  canUpdate,
  canFinalize,
  canDownload,
}: AnnualReportDetailClientProps) {
  const t = useTranslations("periodicReports");
  const roleLabel = useRoleLabel();
  const router = useRouter();
  const formatDateTime = useFormatDateTime();
  const formatNumber = useFormatNumber();
  const formatCurrency = useFormatCurrency();
  const [report, setReport] = useState(initialReport);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isDraft = report.status === "draft";
  const computed = report.computed_data ?? null;
  const manual = report.manual_data ?? null;
  const clubName = report.club?.name ?? t("common.unknownClub");
  const period =
    ecclesiasticalYearLabel(report.ecclesiastical_year) ?? computed?.year_label ?? "—";
  const finalizer = formatReportFinalizerName(report.finalized_by_user);
  const location = [report.club?.churches?.name, report.club?.districts?.name]
    .filter(Boolean)
    .join(" · ");

  // PATCH / regenerate / finalize answer the bare row (no relations): keep what we have.
  function applyUpdate(updated: AdminAnnualReport) {
    setReport((previous) => ({
      ...previous,
      ...updated,
      club: previous.club,
      ecclesiastical_year: previous.ecclesiastical_year,
    }));
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      applyUpdate(await regenerateAnnualReport(report.annual_report_id));
      toast.success(t("common.toasts.regenerated"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.errors.regenerate"));
    } finally {
      setRegenerating(false);
    }
  }

  async function handleFinalize() {
    try {
      applyUpdate(await finalizeAnnualReport(report.annual_report_id));
      toast.success(t("common.toasts.finalized"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.errors.finalize"));
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
          {report.finalized_at ? (
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
          status={report.status}
          canUpdate={canUpdate}
          canFinalize={canFinalize}
          canDownload={canDownload}
          regenerating={regenerating}
          downloading={downloading}
          reportLabel={`${clubName} · ${period}`}
          onRegenerate={handleRegenerate}
          onFinalize={handleFinalize}
          onDownload={handleDownload}
        />
      </div>

      {!isDraft ? (
        <Alert>
          <AlertDescription>{t("common.lockedNotice")}</AlertDescription>
        </Alert>
      ) : null}

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
                {
                  label: t("annual.computed.rankingPercentile"),
                  value:
                    computed.ranking_percentile == null
                      ? null
                      : `${formatNumber(computed.ranking_percentile, { maximumFractionDigits: 1 })}%`,
                },
              ]}
            />
            <ReportFactsCard
              title={t("common.computed.financesTitle")}
              facts={[
                { label: t("common.computed.income"), value: money(computed.finances?.income) },
                { label: t("common.computed.expenses"), value: money(computed.finances?.expenses) },
                { label: t("common.computed.balance"), value: money(computed.finances?.balance) },
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
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("common.computed.empty")}
          </div>
        )}
      </section>

      <section aria-labelledby="annual-manual" className="space-y-4">
        <h2 id="annual-manual" className="text-lg font-semibold tracking-tight">
          {t("common.sections.manual")}
        </h2>
        {isDraft && canUpdate ? (
          <AnnualManualDataForm
            reportId={report.annual_report_id}
            initialData={manual}
            onSaved={applyUpdate}
          />
        ) : (
          <>
            <ReportFactsCard
              title={t("annual.manual.sectionMeetings")}
              facts={[
                { label: t("annual.manual.planningMeetings"), value: count(manual?.planning_meetings) },
                { label: t("annual.manual.parentMeetings"), value: count(manual?.parent_meetings) },
                { label: t("annual.manual.camporeesAttended"), value: count(manual?.camporees_attended) },
              ]}
            />
            <ReportFactsCard
              title={t("annual.manual.sectionMissionary")}
              facts={[
                { label: t("annual.manual.baptizedThisYear"), value: count(manual?.baptized_this_year) },
                { label: t("annual.manual.totalBaptized"), value: count(manual?.total_baptized) },
                {
                  label: t("annual.manual.allInvestituresCompleted"),
                  value:
                    manual?.all_investitures_completed == null
                      ? null
                      : manual.all_investitures_completed
                        ? t("common.yes")
                        : t("common.no"),
                },
              ]}
            />
            <ReportTextCard
              title={t("annual.manual.sectionNarrative")}
              emptyLabel={t("common.manual.noAnswer")}
              entries={[
                { label: t("annual.manual.achievements"), text: manual?.annual_achievements_description },
                { label: t("annual.manual.communityService"), text: manual?.community_service_description },
              ]}
            />
          </>
        )}
      </section>
    </div>
  );
}
