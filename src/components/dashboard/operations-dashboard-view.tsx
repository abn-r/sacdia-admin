import { getTranslations } from "next-intl/server";
import { OperationsDashboardChrome } from "@/components/dashboard/operations-dashboard-chrome";
import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";
import { SupervisionHome } from "@/components/dashboard/operations-home-supervision";
import { DispatchHome } from "@/components/dashboard/operations-home-dispatch";
import type { OperationsGapRow } from "@/components/dashboard/operations-gap-table";
import type { OperationsPeriodContextProps } from "@/components/dashboard/operations-period-context";
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
  dispatchSummary,
  firstAccessibleHref,
  laggingClubs,
  rankChildrenByGap,
  resolveHomeMode,
  supervisionSummary,
  visibleWorkQueue,
  type SummaryMessage,
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
  const mode = resolveHomeMode(meta.scope, query);
  const childLevel = CHILD_LEVEL_BY_SCOPE[meta.scope.level];

  const sentence = (messages: SummaryMessage[]) =>
    messages.map((message) => tHome(`summary.${message.key}`, message.values)).join(" ");

  const queueLabels = {
    roles: t("attention.roleAssignments"),
    transfers: t("attention.transfers"),
    classes: t("attention.classValidations"),
    honors: t("attention.honorsReview"),
    folders: t("attention.annualFolders"),
  };
  const queueItems = visibleWorkQueue(summary, user);

  const honorsUnavailable = summary.honors.attribution === "unavailable";
  const honorsHref = firstAccessibleHref(user, ["/dashboard/clubs/validations?tab=honors"]);
  const activitiesHref = firstAccessibleHref(user, ["/dashboard/clubs/activities"]);
  const context: OperationsPeriodContextProps = {
    headingId: "operations-context",
    title: tHome("periodContextTitle"),
    groups: [
      {
        title: t("formation.title"),
        description: t("formation.description", {
          enrollments: fmt(summary.classes.total_enrollments),
          people: fmt(summary.classes.distinct_people),
        }),
        children: (
          <ClassEnrollmentsChart items={summary.classes.by_class} compact showTable={false} />
        ),
      },
      {
        title: t("honors.title"),
        description: honorsUnavailable
          ? t("honors.attribution.unavailable")
          : t("honors.attribution.current_affiliation"),
        rows: honorsUnavailable
          ? []
          : [
              { label: t("honors.inProgress"), value: fmt(summary.honors.in_progress) },
              {
                label: t("honors.pendingReview"),
                value: fmt(summary.honors.pending_review),
                tone: (summary.honors.pending_review ?? 0) > 0 ? "warning" : "default",
              },
              { label: t("honors.approved"), value: fmt(summary.honors.approved) },
            ],
        action:
          honorsHref && !honorsUnavailable
            ? { href: honorsHref, label: tHome("honorsAction") }
            : undefined,
      },
      {
        title: t("activities.title"),
        description: t("activities.description"),
        rows: [
          { label: t("activities.registered"), value: fmt(summary.activities.registered) },
          { label: t("activities.jointRegistered"), value: fmt(summary.activities.joint_registered) },
          {
            label: t("activities.participatingSections"),
            value: fmt(summary.activities.distinct_participating_sections),
          },
        ],
        action: activitiesHref ? { href: activitiesHref, label: tHome("activitiesAction") } : undefined,
      },
    ],
  };

  const dataQuality = {
    title: t("dataQuality.title"),
    description: t("dataQuality.description"),
    entries: data_quality,
    statusLabels: {
      exact: t("dataQuality.status.exact"),
      current_affiliation: t("dataQuality.status.current_affiliation"),
      unavailable: t("dataQuality.status.unavailable"),
      not_applicable: t("dataQuality.status.not_applicable"),
    },
  };

  return (
    <div className="@container/main flex flex-col gap-6">
      <OperationsDashboardChrome
        data={data}
        query={query}
        title={tHome("title")}
        description={tHome("description")}
      />

      {mode === "dispatch" ? (
        <DispatchHome
          queue={{
            headingId: "operations-queue",
            title: tHome("dispatchTitle"),
            reviewLabel: tHome("review"),
            labels: queueLabels,
            items: queueItems,
            empty: {
              title: tHome("dispatchEmptyTitle"),
              description: tHome("dispatchEmptyDescription"),
            },
          }}
          lagging={{
            headingId: "operations-lagging",
            title: tHome("laggingTitle"),
            rows: laggingClubs(children, hasReportingMonth).map(({ child, reasons }) => ({
              key: `${child.level}-${child.id}`,
              name: child.name,
              href: childHref(child, query),
              reasons: reasons.map((reason) => ({
                label: tHome(`lagReason.${reason}`),
                tone: reason === "missingReport" ? ("danger" as const) : ("muted" as const),
              })),
            })),
          }}
          summary={sentence(dispatchSummary(summary, hasReportingMonth))}
          context={context}
          dataQuality={dataQuality}
        />
      ) : (
        <SupervisionHome
          summary={sentence(supervisionSummary(children, childLevel, summary, hasReportingMonth))}
          gapTable={{
            headingId: "operations-gap",
            title: tHome("gapTable.title", { level: childLevel }),
            description: tHome("gapTable.description"),
            columns: {
              name: tHome("gapTable.columns.name"),
              reports: tHome("gapTable.columns.reports"),
              nonOperational: tHome("gapTable.columns.nonOperational"),
              pending: tHome("gapTable.columns.pending"),
            },
            empty: {
              title: tHome("gapTable.emptyTitle"),
              description: tHome("gapTable.emptyDescription"),
            },
            rows: rankChildrenByGap(children, hasReportingMonth).map(
              ({ child, gap }): OperationsGapRow => ({
                key: `${child.level}-${child.id}`,
                name: child.name,
                href: childHref(child, query),
                reports: hasReportingMonth ? pct(child.monthly_reports.coverage_pct) : "—",
                missingLabel:
                  gap.missingSections > 0
                    ? tHome("gapTable.missingCount", { count: gap.missingSections })
                    : undefined,
                nonOperational: fmt(gap.nonOperationalClubs),
                pending: fmt(gap.pendingTotal),
                hasGap: gap.hasGap,
              }),
            ),
          }}
          pending={{
            headingId: "operations-pending",
            title: tHome("pendingTitle"),
            reviewLabel: tHome("review"),
            labels: queueLabels,
            items: queueItems,
          }}
          context={context}
          dataQuality={dataQuality}
        />
      )}
    </div>
  );
}
