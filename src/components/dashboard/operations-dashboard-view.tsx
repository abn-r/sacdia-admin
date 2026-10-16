import { getTranslations } from "next-intl/server";
import { OperationsDashboardChrome } from "@/components/dashboard/operations-dashboard-chrome";
import { OperationsHomeLayout } from "@/components/dashboard/operations-home-layout";
import type { OperationsGapRow } from "@/components/dashboard/operations-gap-table";
import type { OperationsSecondaryStat } from "@/components/dashboard/operations-secondary-stats";
import {
  buildDashboardHref,
  buildDrillDownQuery,
  formatMetricCount,
  formatMetricPercent,
  type ChildLevel,
  type OperationsDashboardChild,
  type OperationsDashboardData,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";
import {
  attentionTotal,
  firstAccessibleHref,
  groupClassesByClubType,
  rankChildrenByGap,
  resolveHomeMode,
  visibleWorkQueue,
} from "@/lib/dashboard/operations-home";
import type { AuthUser } from "@/lib/auth/types";
import { getFormatNumber } from "@/lib/format-locale";

interface OperationsDashboardViewProps {
  data: OperationsDashboardData;
  query: OperationsDashboardQuery;
  user: AuthUser;
}

const CHILD_LEVEL_BY_SCOPE: Record<OperationsDashboardData["meta"]["scope"]["level"], ChildLevel> = {
  all: "division",
  division: "union",
  union: "local_field",
  local_field: "club",
  coordinator: "club",
};

function childHref(child: OperationsDashboardChild, query: OperationsDashboardQuery): string {
  return child.level === "club"
    ? `/dashboard/clubs/${child.id}`
    : buildDashboardHref(buildDrillDownQuery(child, query));
}

export async function OperationsDashboardView({ data, query, user }: OperationsDashboardViewProps) {
  const t = await getTranslations("dashboardHub.operations");
  const tHome = await getTranslations("dashboardHub.operations.home");
  const formatNumber = await getFormatNumber();
  const { meta, summary, children, data_quality } = data;
  const hasReportingMonth = meta.period.reporting_month !== null;
  const fmt = (value: number | null | undefined) => formatMetricCount(value, formatNumber);
  const pct = (value: number | null | undefined) => formatMetricPercent(value, formatNumber);
  const formatCount = (value: number) => fmt(value);
  const mode = resolveHomeMode(meta.scope, query);
  const childLevel = CHILD_LEVEL_BY_SCOPE[meta.scope.level];

  const { operations, monthly_reports: reports, people, classes, honors, activities } = summary;
  const totalClubs = operations.operational_clubs + operations.non_operational_clubs;
  const reportsPct = hasReportingMonth ? reports.coverage_pct : null;

  const queueItems = visibleWorkQueue(summary, user);
  const pendingTotal = attentionTotal(queueItems);

  const honorsAvailable = honors.attribution !== "unavailable";
  const honorsHref = firstAccessibleHref(user, ["/dashboard/clubs/validations?tab=honors"]);
  const stats: OperationsSecondaryStat[] = [
    {
      id: "activities",
      label: tHome("stats.activities"),
      value: fmt(activities.registered),
      href: firstAccessibleHref(user, ["/dashboard/clubs/activities"]),
    },
  ];
  if (honorsAvailable && honors.pending_review !== null) {
    stats.push({
      id: "honorsPending",
      label: tHome("stats.honorsPending"),
      value: fmt(honors.pending_review),
      href: honorsHref,
    });
  }
  if (honorsAvailable && honors.approved !== null) {
    stats.push({ id: "honorsApproved", label: tHome("stats.honorsApproved"), value: fmt(honors.approved) });
  }

  const formationGroups = groupClassesByClubType(classes.by_class);

  return (
    <div className="@container/main flex flex-col gap-6">
      <OperationsDashboardChrome
        data={data}
        query={query}
        title={tHome("title")}
        description={tHome("description")}
      />

      <OperationsHomeLayout
        mode={mode}
        kpis={{
          label: tHome("kpis.label"),
          items: [
            {
              id: "reports",
              label: tHome("kpis.reports.label"),
              value: pct(reportsPct),
              pct: reportsPct,
              caption: hasReportingMonth
                ? tHome("kpis.reports.caption", {
                    submitted: reports.submitted_sections,
                    expected: reports.expected_sections,
                  })
                : t("noClosedMonth"),
              href: firstAccessibleHref(user, ["/dashboard/reports/supervision", "/dashboard/reports"]),
            },
            {
              id: "clubs",
              label: tHome("kpis.clubs.label"),
              value: fmt(operations.operational_clubs),
              total: tHome("kpis.clubs.total", { total: totalClubs }),
              pct: operations.operational_rate_pct,
              caption: tHome("kpis.clubs.caption", { count: operations.non_operational_clubs }),
              href: firstAccessibleHref(user, ["/dashboard/clubs"]),
            },
            {
              id: "people",
              label: tHome("kpis.people.label"),
              value: fmt(people.institutionally_active),
              caption: tHome("kpis.people.caption", { count: people.platform_accounts.active }),
            },
            {
              id: "enrollments",
              label: tHome("kpis.enrollments.label"),
              value: fmt(classes.total_enrollments),
              caption: tHome("kpis.enrollments.caption", { count: classes.distinct_people }),
            },
          ],
        }}
        breakdown={{
          headingId: "operations-breakdown",
          title: tHome("gapTable.title", { level: childLevel }),
          description: tHome("gapTable.description"),
          columns: {
            name: tHome("gapTable.columns.name"),
            reports: tHome("gapTable.columns.reports"),
            operational: tHome("gapTable.columns.operational"),
          },
          emptyLabel: tHome("gapTable.emptyTitle", { level: childLevel }),
          rows: rankChildrenByGap(children, hasReportingMonth).map(
            ({ child }): OperationsGapRow => {
              const childReportsPct = hasReportingMonth ? child.monthly_reports.coverage_pct : null;
              const childTotal =
                child.operations.operational_clubs + child.operations.non_operational_clubs;
              return {
                key: `${child.level}-${child.id}`,
                name: child.name,
                href: childHref(child, query),
                reports: { pct: childReportsPct, label: pct(childReportsPct) },
                operational: {
                  pct: child.operations.operational_rate_pct,
                  label: `${fmt(child.operations.operational_clubs)}/${fmt(childTotal)}`,
                },
              };
            },
          ),
        }}
        attention={{
          headingId: "operations-attention",
          title: t("attention.title"),
          labels: {
            roles: t("attention.roleAssignments"),
            transfers: t("attention.transfers"),
            classes: t("attention.classValidations"),
            honors: t("attention.honorsReview"),
            folders: t("attention.annualFolders"),
          },
          items: queueItems,
          total: fmt(pendingTotal),
          totalLabel: t("attention.total", { count: pendingTotal }),
          formatCount,
          emptyLabel: t("attention.empty"),
        }}
        formation={{
          headingId: "operations-formation",
          title: t("formation.title"),
          chartLabel: t("formation.chartAriaLabel"),
          summary: t("formation.summary", {
            enrollments: classes.total_enrollments,
            people: classes.distinct_people,
            classes: formationGroups.reduce((total, group) => total + group.items.length, 0),
          }),
          legendLabel: t("formation.legendLabel"),
          emptyLabel: t("formation.emptyTitle"),
          groups: formationGroups,
          formatCount,
        }}
        stats={{ label: tHome("stats.label"), items: stats }}
        dataQuality={{
          title: t("dataQuality.title"),
          description: t("dataQuality.description"),
          entries: data_quality,
          statusLabels: {
            exact: t("dataQuality.status.exact"),
            current_affiliation: t("dataQuality.status.current_affiliation"),
            unavailable: t("dataQuality.status.unavailable"),
            not_applicable: t("dataQuality.status.not_applicable"),
          },
        }}
      />
    </div>
  );
}
