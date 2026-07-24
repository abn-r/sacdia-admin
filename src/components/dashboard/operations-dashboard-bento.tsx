import { getTranslations, getLocale } from "next-intl/server";
import { OperationsDashboardBentoClient } from "@/components/dashboard/operations-dashboard-bento-client";
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
    <OperationsDashboardBentoClient
      summary={summary}
      classItems={summary.classes.by_class}
      reportingMonthLabel={reportingMonthLabel}
      honorsUnavailable={honorsUnavailable}
      labels={{
        operationTitle: t("stats.operationalClubs"),
        operationSub: t("stats.operationalClubsDetail"),
        adminTitle: t("groups.adminClubs"),
        adminActive: t("stats.adminActive"),
        adminInactive: t("stats.adminInactive"),
        reportsTitle: t("groups.reports"),
        reportsPeriod: t("stats.monthlyCoverage"),
        reportsNoMonth: t("stats.noClosedMonth"),
        peopleTitle: t("stats.institutionalActive"),
        peoplePlatformActive: t("stats.platformActive"),
        peoplePlatformInactive: t("stats.platformInactive"),
        queuesTitle: t("groups.queues"),
        queuesFooter: t("stats.transfersPending"),
        honorsTitle: t("groups.honors"),
        honorsInProgress: t("stats.honorsInProgress"),
        honorsPending: t("stats.honorsPendingReview"),
        honorsApproved: t("stats.honorsApproved"),
        honorsUnavailable: t("honorsAttribution.unavailable"),
        activitiesTitle: t("stats.activitiesRegistered"),
        activitiesJoint: t("stats.activitiesJoint"),
        activitiesSections: t("stats.activitiesSections"),
        formationTitle: t("groups.formation"),
        formationEnrollments: t("stats.totalEnrollments"),
        formationPeople: t("stats.distinctPeople"),
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
        operationalClubs: fmt(summary.operations.operational_clubs),
        operationalSections: fmt(summary.operations.operational_sections),
        operationalRate: pct(summary.operations.operational_rate_pct),
        nonOperationalClubs: fmt(summary.operations.non_operational_clubs),
        adminTotal: fmt(summary.administrative_clubs.total),
        adminActive: fmt(summary.administrative_clubs.active),
        adminInactive: fmt(summary.administrative_clubs.inactive),
        institutionalActive: fmt(summary.people.institutionally_active),
        platformActive: fmt(summary.people.platform_accounts.active),
        platformInactive: fmt(summary.people.platform_accounts.inactive),
        coverage: reportingMonth ? pct(summary.monthly_reports.coverage_pct) : "—",
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
        totalEnrollments: fmt(summary.classes.total_enrollments),
        distinctPeople: fmt(summary.classes.distinct_people),
      }}
    />
  );
}
