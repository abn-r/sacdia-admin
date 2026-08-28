import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ClipboardList, Info } from "lucide-react";
import { OperationsDashboardChrome } from "@/components/dashboard/operations-dashboard-chrome";
import { OperationsKpiStrip } from "@/components/dashboard/operations-kpi-strip";
import {
  OperationsDashboardV2Charts,
  type OperationsV2ChartLabels,
} from "@/components/dashboard/operations-dashboard-v2-charts";
import { TerritoryBreakdownTable } from "@/components/dashboard/territory-breakdown-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildDashboardHref,
  buildDrillDownQuery,
  formatMetricCount,
  type OperationsDashboardChild,
  type OperationsDashboardData,
  type OperationsDashboardDataQuality,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";
import { getFormatNumber } from "@/lib/format-locale";

interface OperationsDashboardV2ViewProps {
  data: OperationsDashboardData;
  query: OperationsDashboardQuery;
}

function qualityBadgeVariant(
  status: OperationsDashboardDataQuality["status"],
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "exact":
      return "default";
    case "current_affiliation":
      return "secondary";
    case "not_applicable":
      return "outline";
    case "unavailable":
      return "destructive";
    default:
      return "outline";
  }
}

function topTerritoryAlerts(
  children: OperationsDashboardChild[],
  reportingMonth: OperationsDashboardData["meta"]["period"]["reporting_month"],
): OperationsDashboardChild[] {
  if (!reportingMonth) return [];

  return [...children]
    .sort((a, b) => b.monthly_reports.missing_sections - a.monthly_reports.missing_sections)
    .slice(0, 3)
    .filter((child) => child.monthly_reports.missing_sections > 0);
}

function activeQueueTypes(summary: OperationsDashboardData["summary"]): number {
  return [
    summary.queues.role_assignments_pending,
    summary.queues.transfers_pending,
    summary.queues.class_validations_pending,
    summary.queues.honors_review_pending,
    summary.queues.annual_folders_pending_union,
  ].filter((value) => (value ?? 0) > 0).length;
}

export async function OperationsDashboardV2View({ data, query }: OperationsDashboardV2ViewProps) {
  const t = await getTranslations("dashboardHub.operations.v2");
  const tBase = await getTranslations("dashboardHub.operations");
  const tCharts = await getTranslations("dashboardHub.operations.v2.charts");
  const formatNumber = await getFormatNumber();
  const { meta, summary, children, data_quality } = data;
  const reportingMonth = meta.period.reporting_month;

  const fmt = (value: number | null | undefined) => formatMetricCount(value, formatNumber);

  const territoryAlerts = topTerritoryAlerts(children, reportingMonth);
  const honorsUnavailable = summary.honors.attribution === "unavailable";
  const queuePressure = activeQueueTypes(summary);

  const chartLabels: OperationsV2ChartLabels = {
    operationTitle: t("operationLens.title"),
    operationDescription: t("operationLens.description"),
    complianceTitle: t("compliance.title"),
    complianceDescription: t("compliance.description"),
    complianceNotApplicable: t("compliance.notApplicable"),
    peopleTitle: t("people.title"),
    peopleDescription: t("people.description"),
    formationTitle: t("formation.title"),
    formationDescription: t("formation.description", {
      enrollments: fmt(summary.classes.total_enrollments),
      people: fmt(summary.classes.distinct_people),
    }),
    formationEmpty: t("formation.empty"),
    honorsTitle: t("honors.title"),
    honorsDescription: honorsUnavailable
      ? t("honors.unavailable")
      : tBase(`honors.attribution.${summary.honors.attribution}`),
    honorsUnavailable: t("honors.unavailable"),
    activitiesTitle: t("activities.title"),
    activitiesDescription: t("activities.description"),
    queuesTitle: t("queues.title"),
    queuesDescription: t("queues.description"),
    territoryTitle: tCharts("territoryComparison"),
    territoryDescription: tBase("territory.description"),
    operationalRate: t("operationLens.operationalRate"),
    coverage: t("compliance.coverage"),
    operationalClubs: t("operationLens.operationalClubs"),
    nonOperationalClubs: tCharts("nonOperationalClubs"),
    adminActive: t("operationLens.adminActive"),
    adminInactive: t("operationLens.adminInactive"),
    institutional: t("people.institutional"),
    platformActive: t("people.platformActive"),
    platformInactive: t("people.platformInactive"),
    submitted: tBase("bento.charts.submitted"),
    draft: tBase("bento.charts.draft"),
    generated: tBase("bento.charts.generated"),
    missing: tBase("bento.charts.missing"),
    expected: tBase("bento.charts.expected"),
    registered: tBase("bento.charts.registered"),
    joint: tBase("bento.charts.joint"),
    sections: tBase("bento.charts.sections"),
    honorsInProgress: t("honors.inProgress"),
    honorsPending: t("honors.pendingReview"),
    honorsApproved: t("honors.approved"),
    queueRoles: t("queues.roleAssignments"),
    queueTransfers: t("queues.transfers"),
    queueClasses: t("queues.classValidations"),
    queueHonors: t("queues.honorsReview"),
    queueFolders: t("queues.annualFolders"),
    territoryOperational: tCharts("territoryOperational"),
    territoryMissing: tCharts("territoryMissing"),
    territoryPeople: tCharts("territoryPeople"),
  };

  return (
    <div className="@container/main flex flex-col gap-5 md:gap-6">
      <OperationsDashboardChrome
        data={data}
        query={query}
        activeVersion="v2"
        title={t("title")}
        description={t("description")}
      />

      <OperationsKpiStrip
        heading={t("signals.title")}
        items={[
          {
            id: "operative-gap",
            label: t("signals.operativeGap"),
            value: fmt(summary.operations.non_operational_clubs),
            hint: t("signals.operativeGapDetail", {
              total: fmt(summary.administrative_clubs.total),
            }),
            hintTone: summary.operations.non_operational_clubs > 0 ? "warning" : "default",
          },
          {
            id: "report-debt",
            label: t("signals.reportDebt"),
            value: reportingMonth ? fmt(summary.monthly_reports.missing_sections) : "—",
            hint: reportingMonth
              ? t("signals.reportDebtDetail", {
                  expected: fmt(summary.monthly_reports.expected_sections),
                })
              : t("signals.reportDebtUnavailable"),
            hintTone:
              reportingMonth && summary.monthly_reports.missing_sections > 0
                ? "warning"
                : "default",
          },
          {
            id: "digital-gap",
            label: t("signals.digitalGap"),
            value: fmt(summary.people.platform_accounts.inactive),
            hint: t("signals.digitalGapDetail", {
              institutional: fmt(summary.people.institutionally_active),
            }),
            hintTone: summary.people.platform_accounts.inactive > 0 ? "warning" : "default",
          },
          {
            id: "queue-pressure",
            label: t("signals.workflowPressure"),
            value: fmt(queuePressure),
            hint: t("signals.workflowPressureDetail"),
            hintTone: queuePressure > 0 ? "warning" : "default",
          },
        ]}
      />

      <OperationsDashboardV2Charts
        summary={summary}
        classItems={summary.classes.by_class}
        territoryChildren={children}
        labels={chartLabels}
        reportingMonthActive={Boolean(reportingMonth)}
        honorsUnavailable={honorsUnavailable}
      />

      {territoryAlerts.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" aria-hidden />
              {t("alerts.title")}
            </CardTitle>
            <CardDescription>{t("alerts.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {territoryAlerts.map((child) => (
                <li
                  key={`${child.level}-${child.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{child.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {tBase(`territory.level.${child.level}`)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-destructive tabular-nums">
                      {t("alerts.missingReports", {
                        count: fmt(child.monthly_reports.missing_sections),
                      })}
                    </span>
                    {child.level !== "club" ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={buildDashboardHref(buildDrillDownQuery(child, query))}>
                          {t("alerts.inspect")}
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/clubs/${child.id}`}>{t("alerts.openClub")}</Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{tBase("territory.title")}</CardTitle>
          <CardDescription>{tBase("territory.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TerritoryBreakdownTable
            territoryChildren={children}
            query={query}
            reportingMonth={reportingMonth}
          />
        </CardContent>
      </Card>

      {data_quality.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-4" aria-hidden />
              {tBase("dataQuality.title")}
            </CardTitle>
            <CardDescription>{tBase("dataQuality.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {data_quality.map((entry) => (
                <li key={entry.metric} className="rounded-xl border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{entry.metric}</span>
                    <Badge variant={qualityBadgeVariant(entry.status)}>
                      {tBase(`dataQuality.status.${entry.status}`)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground text-sm">{entry.note}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
