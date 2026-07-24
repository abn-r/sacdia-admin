import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import {
  ArrowLeft,
  CalendarRange,
  ClipboardList,
  Info,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardVersionSwitch } from "@/components/dashboard/dashboard-version-switch";
import {
  OperationsDashboardV2Charts,
  type OperationsV2ChartLabels,
} from "@/components/dashboard/operations-dashboard-v2-charts";
import { TerritoryBreakdownTable } from "@/components/dashboard/territory-breakdown-table";
import {
  buildDashboardHref,
  buildDrillDownQuery,
  buildResetScopeQuery,
  formatMetricCount,
  type OperationsDashboardChild,
  type OperationsDashboardData,
  type OperationsDashboardDataQuality,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";
import { formatDate, formatDateTime, getFormatNumber } from "@/lib/format-locale";

interface OperationsDashboardV2ViewProps {
  data: OperationsDashboardData;
  query: OperationsDashboardQuery;
}

function scopeBreadcrumbLabels(data: OperationsDashboardData): string[] {
  const labels = data.meta.scope.path.map((node) => node.name);
  if (data.meta.scope.level !== "all") {
    labels.push(data.meta.scope.name);
  }
  return labels;
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

export async function OperationsDashboardV2View({ data, query }: OperationsDashboardV2ViewProps) {
  const t = await getTranslations("dashboardHub.operations.v2");
  const tBase = await getTranslations("dashboardHub.operations");
  const tCharts = await getTranslations("dashboardHub.operations.v2.charts");
  const locale = await getLocale();
  const formatNumber = await getFormatNumber();
  const { meta, summary, children, data_quality } = data;
  const reportingMonth = meta.period.reporting_month;

  const fmt = (value: number | null | undefined) => formatMetricCount(value, formatNumber);

  const breadcrumbText = scopeBreadcrumbLabels(data).join(" › ") || meta.scope.name;
  const resetHref = buildDashboardHref(buildResetScopeQuery(query));
  const hasTerritorialFilter = Boolean(query.division_id || query.union_id || query.local_field_id);

  const monthLabel = reportingMonth
    ? formatDate(new Date(reportingMonth.year, reportingMonth.month - 1, 1), locale, {
        month: "long",
        year: "numeric",
      })
    : tBase("noClosedMonth");

  const territoryAlerts = topTerritoryAlerts(children, reportingMonth);
  const honorsUnavailable = summary.honors.attribution === "unavailable";

  const chartLabels: OperationsV2ChartLabels = {
    signalsTitle: t("signals.title"),
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
    operationalSections: t("operationLens.operationalSections"),
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
    signalOperative: t("signals.operativeGap"),
    signalReports: t("signals.reportDebt"),
    signalDigital: t("signals.digitalGap"),
    signalQueues: t("signals.workflowPressure"),
  };

  return (
    <div className="@container/main flex flex-col gap-6 md:gap-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardVersionSwitch query={query} active="v2" />
            {hasTerritorialFilter ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={resetHref}>
                  <ArrowLeft className="mr-2 size-4" aria-hidden />
                  {tBase("backToMyScope")}
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <MapPin className="size-3" aria-hidden />
            {tBase("currentScope")}: {meta.scope.name}
          </Badge>
          {meta.cached ? (
            <Badge variant="outline" className="text-muted-foreground">
              {tBase("cachedResponse")}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">{breadcrumbText}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="size-3.5" aria-hidden />
            {tBase("ecclesiasticalYear")}:{" "}
            {formatDate(meta.period.ecclesiastical_year.start_date, locale)} –{" "}
            {formatDate(meta.period.ecclesiastical_year.end_date, locale)}
          </span>
          <span>
            {tBase("reportingMonth")}: {monthLabel}
          </span>
          <time dateTime={meta.computed_at}>
            {tBase("computedAt", { date: formatDateTime(meta.computed_at, locale) })}
          </time>
        </div>
      </div>

      <OperationsDashboardV2Charts
        summary={summary}
        classItems={summary.classes.by_class}
        territoryChildren={children}
        labels={chartLabels}
        reportingMonthActive={Boolean(reportingMonth)}
        honorsUnavailable={honorsUnavailable}
      />

      {territoryAlerts.length > 0 ? (
        <Card>
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

      <Card>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-4" aria-hidden />
              {tBase("dataQuality.title")}
            </CardTitle>
            <CardDescription>{tBase("dataQuality.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
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
