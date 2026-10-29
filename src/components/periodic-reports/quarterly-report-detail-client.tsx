"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PeriodicReportActions } from "@/components/periodic-reports/report-actions";
import { PeriodicReportStatusBadge } from "@/components/periodic-reports/report-status-badge";
import { QuarterlyManualDataForm } from "@/components/periodic-reports/quarterly-manual-data-form";
import {
  ReportFactsCard,
  ReportPeopleCard,
  ReportTextCard,
} from "@/components/periodic-reports/report-sections";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  finalizeQuarterlyReport,
  formatReportFinalizerName,
  regenerateQuarterlyReport,
  triggerQuarterlyReportPdfDownload,
  type AdminQuarterlyReport,
} from "@/lib/api/reports";
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
  /** reports:update — manual data form and Recalcular. */
  canUpdate: boolean;
  /** reports:update — Finalizar. */
  canFinalize: boolean;
  /** reports:download */
  canDownload: boolean;
}

export function QuarterlyReportDetailClient({
  report: initialReport,
  canUpdate,
  canFinalize,
  canDownload,
}: QuarterlyReportDetailClientProps) {
  const t = useTranslations("periodicReports");
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
  const period = t("quarterly.period", { quarter: report.quarter, year: report.year });
  const finalizer = formatReportFinalizerName(report.finalized_by_user);
  const location = [report.club?.churches?.name, report.club?.districts?.name]
    .filter(Boolean)
    .join(" · ");

  // PATCH / regenerate / finalize answer the bare row (no club relations): keep what we have.
  function applyUpdate(updated: AdminQuarterlyReport) {
    setReport((previous) => ({ ...previous, ...updated, club: previous.club }));
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      applyUpdate(await regenerateQuarterlyReport(report.quarterly_report_id));
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
      applyUpdate(await finalizeQuarterlyReport(report.quarterly_report_id));
      toast.success(t("common.toasts.finalized"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.errors.finalize"));
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
                { label: t("common.computed.transactions"), value: count(computed.finances?.transactions) },
              ]}
            />
            <ReportPeopleCard
              title={t("common.computed.directiva")}
              emptyLabel={t("common.computed.directivaEmpty")}
              people={(computed.directiva ?? []).map((member, index) => ({
                key: `${member.user_id ?? "member"}-${index}`,
                primary: member.name ?? "—",
                secondary: member.role ?? undefined,
              }))}
            />
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("common.computed.empty")}
          </div>
        )}
      </section>

      <section aria-labelledby="quarterly-manual" className="space-y-4">
        <h2 id="quarterly-manual" className="text-lg font-semibold tracking-tight">
          {t("common.sections.manual")}
        </h2>
        {isDraft && canUpdate ? (
          <QuarterlyManualDataForm
            reportId={report.quarterly_report_id}
            initialData={manual}
            onSaved={applyUpdate}
          />
        ) : (
          <>
            <ReportFactsCard
              title={t("quarterly.manual.sectionMeetings")}
              facts={[
                { label: t("quarterly.manual.planningMeetings"), value: count(manual?.planning_meetings) },
                { label: t("quarterly.manual.parentMeetings"), value: count(manual?.parent_meetings) },
                { label: t("quarterly.manual.youthCouncilAttendance"), value: count(manual?.youth_council_attendance) },
                { label: t("quarterly.manual.churchBoardAttendance"), value: count(manual?.church_board_attendance) },
              ]}
            />
            <ReportFactsCard
              title={t("quarterly.manual.sectionMissionary")}
              facts={[
                { label: t("quarterly.manual.soulTarget"), value: count(manual?.soul_target) },
                { label: t("quarterly.manual.baptizedThisQuarter"), value: count(manual?.baptized_this_quarter) },
                { label: t("quarterly.manual.camporeesAttended"), value: count(manual?.camporees_attended) },
                {
                  label: t("quarterly.manual.certificatesDelivered"),
                  value:
                    manual?.certificates_delivered == null
                      ? null
                      : manual.certificates_delivered
                        ? t("common.yes")
                        : t("common.no"),
                },
              ]}
            />
            <ReportTextCard
              title={t("quarterly.manual.sectionNarrative")}
              emptyLabel={t("common.manual.noAnswer")}
              entries={[
                { label: t("quarterly.manual.clubParticipation"), text: manual?.club_participation_description },
                { label: t("quarterly.manual.communityService"), text: manual?.community_service_description },
              ]}
            />
          </>
        )}
      </section>
    </div>
  );
}
