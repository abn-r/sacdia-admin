import { getTranslations, getLocale } from "next-intl/server";
import { OperationsDashboardBentoClient } from "@/components/dashboard/operations-dashboard-bento-client";
import { OperationsKpiStrip } from "@/components/dashboard/operations-kpi-strip";
import {
  formatMetricCount,
  formatMetricPercent,
  type DashboardMetrics,
} from "@/lib/api/operations-dashboard";
import { formatDate, getFormatNumber } from "@/lib/format-locale";

interface OperationsDashboardBentoProps {
  summary: DashboardMetrics;
  reportingMonth: { year: number; month: number } | null;
}

export async function OperationsDashboardBento({
  summary,
  reportingMonth,
}: OperationsDashboardBentoProps) {
  const t = await getTranslations("dashboardHub.operations.bento");
  const tKpis = await getTranslations("dashboardHub.operations.kpis");
  const locale = await getLocale();
  const formatNumber = await getFormatNumber();

  const fmt = (value: number | null | undefined) =>
    formatMetricCount(value, formatNumber);
  const pct = (value: number | null | undefined) =>
    formatMetricPercent(value, formatNumber);

  const reportingMonthLabel = reportingMonth
    ? formatDate(new Date(reportingMonth.year, reportingMonth.month - 1, 1), locale, {
        month: "long",
        year: "numeric",
      })
    : null;

  const honorsUnavailable = summary.honors.attribution === "unavailable";

  return (
    <div className="flex flex-col gap-5">
      <OperationsKpiStrip
        heading={tKpis("sectionTitle")}
        items={[
          {
            id: "operational",
            label: t("stats.operationalClubs"),
            value: fmt(summary.operations.operational_clubs),
            hint: `${fmt(summary.operations.operational_sections)} ${t("stats.operationalSections")} · ${pct(summary.operations.operational_rate_pct)}`,
            hintTone: "positive",
          },
          {
            id: "admin",
            label: t("groups.adminClubs"),
            value: fmt(summary.administrative_clubs.total),
            hint: `${fmt(summary.administrative_clubs.active)} ${t("stats.adminActive")} · ${fmt(summary.administrative_clubs.inactive)} ${t("stats.adminInactive")}`,
          },
          {
            id: "reports",
            label: t("groups.reports"),
            value: reportingMonth ? pct(summary.monthly_reports.coverage_pct) : "—",
            hint: reportingMonth
              ? t("stats.monthlyCoverageDetail", {
                  submitted: fmt(summary.monthly_reports.submitted_sections),
                  expected: fmt(summary.monthly_reports.expected_sections),
                })
              : t("stats.noClosedMonth"),
            hintTone:
              reportingMonth && summary.monthly_reports.missing_sections > 0
                ? "warning"
                : "default",
          },
          {
            id: "people",
            label: t("stats.institutionalActive"),
            value: fmt(summary.people.institutionally_active),
            hint: `${t("stats.platformActive")} ${fmt(summary.people.platform_accounts.active)} · ${t("stats.platformInactive")} ${fmt(summary.people.platform_accounts.inactive)}`,
          },
        ]}
      />

      <OperationsDashboardBentoClient
        summary={summary}
        classItems={summary.classes.by_class}
        honorsUnavailable={honorsUnavailable}
        labels={{
          reportsTitle: t("groups.reports"),
          reportsDescription: reportingMonthLabel
            ? `${t("stats.monthlyCoverage")}: ${reportingMonthLabel}`
            : t("groups.reportsNotApplicable"),
          peopleTitle: t("groups.people"),
          peopleDescription: t("groups.peopleDescription"),
          peoplePlatformActive: t("stats.platformActive"),
          peoplePlatformInactive: t("stats.platformInactive"),
          queuesTitle: t("groups.queues"),
          queuesDescription: t("groups.queuesDescription"),
          queueRoles: t("stats.roleAssignmentsPending"),
          queueTransfers: t("stats.transfersPending"),
          queueClasses: t("stats.classValidationsPending"),
          queueHonors: t("stats.honorsReviewPending"),
          queueFolders: t("stats.annualFoldersPending"),
          honorsTitle: t("groups.honors"),
          honorsInProgress: t("stats.honorsInProgress"),
          honorsPending: t("stats.honorsPendingReview"),
          honorsApproved: t("stats.honorsApproved"),
          honorsUnavailable: t("honorsAttribution.unavailable"),
          activitiesTitle: t("stats.activitiesRegistered"),
          activitiesDescription: t("groups.activitiesDescription"),
          activitiesJoint: t("stats.activitiesJoint"),
          activitiesSections: t("stats.activitiesSections"),
          formationTitle: t("groups.formation"),
          formationDescription: t("groups.formationDescription", {
            enrollments: fmt(summary.classes.total_enrollments),
            people: fmt(summary.classes.distinct_people),
          }),
          chartSubmitted: t("charts.submitted"),
          chartDraft: t("charts.draft"),
          chartGenerated: t("charts.generated"),
          chartMissing: t("charts.missing"),
          chartExpected: t("charts.expected"),
          chartRegistered: t("charts.registered"),
          chartJoint: t("charts.joint"),
          chartSections: t("charts.sections"),
        }}
        formatted={{
          platformActive: fmt(summary.people.platform_accounts.active),
          platformInactive: fmt(summary.people.platform_accounts.inactive),
          expected: fmt(summary.monthly_reports.expected_sections),
          submitted: fmt(summary.monthly_reports.submitted_sections),
          draft: fmt(summary.monthly_reports.draft_sections),
          generated: fmt(summary.monthly_reports.generated_sections),
          missing: fmt(summary.monthly_reports.missing_sections),
          roleAssignments: fmt(summary.queues.role_assignments_pending),
          transfers: fmt(summary.queues.transfers_pending),
          classValidations: fmt(summary.queues.class_validations_pending),
          honorsReview: fmt(summary.queues.honors_review_pending),
          annualFolders: fmt(summary.queues.annual_folders_pending_union),
          honorsInProgress: fmt(summary.honors.in_progress),
          honorsPending: fmt(summary.honors.pending_review),
          honorsApproved: fmt(summary.honors.approved),
          activitiesRegistered: fmt(summary.activities.registered),
          activitiesJoint: fmt(summary.activities.joint_registered),
          activitiesSections: fmt(summary.activities.distinct_participating_sections),
        }}
      />
    </div>
  );
}
