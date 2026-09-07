import { getTranslations, getLocale } from "next-intl/server";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OperationsDashboardChrome } from "@/components/dashboard/operations-dashboard-chrome";
import { OperationsKpiStrip } from "@/components/dashboard/operations-kpi-strip";
import { OperationsWorkQueue } from "@/components/dashboard/operations-work-queue";
import { OperationsCoverageCard } from "@/components/dashboard/operations-coverage-card";
import { OperationsShortcuts } from "@/components/dashboard/operations-shortcuts";
import { OperationsDataQuality } from "@/components/dashboard/operations-data-quality";
import { TerritoryBreakdownTable } from "@/components/dashboard/territory-breakdown-table";
import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";
import { OperationsStatRow } from "@/components/dashboard/operations-bento-tile";
import {
  formatMetricCount,
  formatMetricPercent,
  type OperationsDashboardData,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";
import {
  buildWorkQueue,
  firstAccessibleHref,
  resolveAccessibleShortcuts,
  resolveReportsHref,
  type OperationsQueueId,
} from "@/lib/dashboard/operations-home";
import type { AuthUser } from "@/lib/auth/types";
import { getFormatNumber, formatDate } from "@/lib/format-locale";

interface OperationsDashboardViewProps {
  data: OperationsDashboardData;
  query: OperationsDashboardQuery;
  user: AuthUser;
}

export async function OperationsDashboardView({
  data,
  query,
  user,
}: OperationsDashboardViewProps) {
  const t = await getTranslations("dashboardHub.operations");
  const tHome = await getTranslations("dashboardHub.operations.home");
  const tBento = await getTranslations("dashboardHub.operations.bento");
  const locale = await getLocale();
  const formatNumber = await getFormatNumber();
  const { meta, summary, children, data_quality } = data;
  const reportingMonth = meta.period.reporting_month;
  const fmt = (value: number | null | undefined) => formatMetricCount(value, formatNumber);
  const pct = (value: number | null | undefined) => formatMetricPercent(value, formatNumber);

  const clubsHref = firstAccessibleHref(user, ["/dashboard/clubs"]);
  const usersHref = firstAccessibleHref(user, ["/dashboard/users"]);
  const reportsHref = resolveReportsHref(user);
  const enrollmentsHref = firstAccessibleHref(user, ["/dashboard/enrollments"]);
  const activitiesHref = firstAccessibleHref(user, ["/dashboard/clubs/activities"]);
  const honorsHref = firstAccessibleHref(user, ["/dashboard/clubs/validations?tab=honors"]);

  const workItems = buildWorkQueue(summary);
  const accessibleQueueHrefs = Object.fromEntries(
    workItems
      .map((item) => [item.id, firstAccessibleHref(user, [item.href])] as const)
      .filter((entry): entry is [OperationsQueueId, string] => Boolean(entry[1])),
  ) as Partial<Record<OperationsQueueId, string>>;

  const reportingMonthLabel = reportingMonth
    ? formatDate(new Date(reportingMonth.year, reportingMonth.month - 1, 1), locale, {
        month: "long",
        year: "numeric",
      })
    : null;

  const honorsUnavailable = summary.honors.attribution === "unavailable";

  return (
    <div className="@container/main flex flex-col gap-6">
      <OperationsDashboardChrome
        data={data}
        query={query}
        title={tHome("title")}
        description={tHome("description")}
      />

      <OperationsWorkQueue
        title={tHome("inboxTitle")}
        description={tHome("inboxDescription")}
        emptyTitle={tHome("inboxEmptyTitle")}
        emptyDescription={tHome("inboxEmptyDescription")}
        openLabel={tHome("openQueue")}
        labels={{
          roles: t("attention.roleAssignments"),
          transfers: t("attention.transfers"),
          classes: t("attention.classValidations"),
          honors: t("attention.honorsReview"),
          folders: t("attention.annualFolders"),
        }}
        items={workItems}
        accessibleHrefs={accessibleQueueHrefs}
      />

      <OperationsKpiStrip
        heading={t("kpis.sectionTitle")}
        items={[
          {
            id: "operational",
            label: tBento("stats.operationalClubs"),
            value: fmt(summary.operations.operational_clubs),
            hint: `${fmt(summary.operations.operational_sections)} ${tBento("stats.operationalSections")} · ${pct(summary.operations.operational_rate_pct)}`,
            hintTone: "positive",
            href: clubsHref,
          },
          {
            id: "gap",
            label: tBento("stats.nonOperationalClubs"),
            value: fmt(summary.operations.non_operational_clubs),
            hint: `${fmt(summary.administrative_clubs.total)} ${tBento("stats.adminTotal")}`,
            hintTone: summary.operations.non_operational_clubs > 0 ? "warning" : "default",
            href: clubsHref,
          },
          {
            id: "reports",
            label: tBento("groups.reports"),
            value: reportingMonth ? pct(summary.monthly_reports.coverage_pct) : "—",
            hint: reportingMonth
              ? tBento("stats.monthlyCoverageDetail", {
                  submitted: fmt(summary.monthly_reports.submitted_sections),
                  expected: fmt(summary.monthly_reports.expected_sections),
                })
              : tBento("stats.noClosedMonth"),
            hintTone:
              reportingMonth && summary.monthly_reports.missing_sections > 0
                ? "warning"
                : "default",
            href: reportsHref,
          },
          {
            id: "people",
            label: tBento("stats.institutionalActive"),
            value: fmt(summary.people.institutionally_active),
            hint: `${tBento("stats.platformActive")} ${fmt(summary.people.platform_accounts.active)} · ${tBento("stats.platformInactive")} ${fmt(summary.people.platform_accounts.inactive)}`,
            href: usersHref,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <OperationsCoverageCard
          title={tHome("coverageTitle")}
          description={
            reportingMonthLabel
              ? `${tBento("stats.monthlyCoverage")}: ${reportingMonthLabel}`
              : tBento("groups.reportsNotApplicable")
          }
          coverageLabel={tBento("stats.monthlyCoverage")}
          coverageValue={reportingMonth ? pct(summary.monthly_reports.coverage_pct) : "—"}
          coveragePct={reportingMonth ? summary.monthly_reports.coverage_pct : null}
          submittedLabel={tBento("charts.submitted")}
          submittedValue={fmt(summary.monthly_reports.submitted_sections)}
          missingLabel={tBento("charts.missing")}
          missingValue={fmt(summary.monthly_reports.missing_sections)}
          expectedLabel={tBento("charts.expected")}
          expectedValue={fmt(summary.monthly_reports.expected_sections)}
          notApplicable={!reportingMonth}
          notApplicableLabel={tBento("stats.noClosedMonth")}
          actionLabel={tHome("coverageAction")}
          href={reportsHref}
          hasMissing={Boolean(reportingMonth && summary.monthly_reports.missing_sections > 0)}
        />

        <Card size="sm" className="h-auto">
          <CardHeader>
            <CardTitle>{tBento("groups.formation")}</CardTitle>
            <CardDescription>
              {tBento("groups.formationDescription", {
                enrollments: fmt(summary.classes.total_enrollments),
                people: fmt(summary.classes.distinct_people),
              })}
            </CardDescription>
            {enrollmentsHref ? (
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link href={enrollmentsHref}>{tHome("formationAction")}</Link>
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            <ClassEnrollmentsChart items={summary.classes.by_class} compact showTable={false} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>{tBento("groups.honors")}</CardTitle>
            <CardDescription>
              {honorsUnavailable
                ? tBento("honorsAttribution.unavailable")
                : t(`honors.attribution.${summary.honors.attribution}`)}
            </CardDescription>
            {honorsHref && !honorsUnavailable ? (
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link href={honorsHref}>{tHome("honorsAction")}</Link>
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-1.5">
            {honorsUnavailable ? null : (
              <>
                <OperationsStatRow
                  label={tBento("stats.honorsInProgress")}
                  value={fmt(summary.honors.in_progress)}
                />
                <OperationsStatRow
                  label={tBento("stats.honorsPendingReview")}
                  value={fmt(summary.honors.pending_review)}
                  tone={(summary.honors.pending_review ?? 0) > 0 ? "warning" : "default"}
                />
                <OperationsStatRow
                  label={tBento("stats.honorsApproved")}
                  value={fmt(summary.honors.approved)}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>{tBento("stats.activitiesRegistered")}</CardTitle>
            <CardDescription>{tBento("groups.activitiesDescription")}</CardDescription>
            {activitiesHref ? (
              <CardAction>
                <Button variant="outline" size="sm" asChild>
                  <Link href={activitiesHref}>{tHome("activitiesAction")}</Link>
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-1.5">
            <OperationsStatRow
              label={tBento("charts.registered")}
              value={fmt(summary.activities.registered)}
            />
            <OperationsStatRow
              label={tBento("stats.activitiesJoint")}
              value={fmt(summary.activities.joint_registered)}
            />
            <OperationsStatRow
              label={tBento("stats.activitiesSections")}
              value={fmt(summary.activities.distinct_participating_sections)}
            />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="operations-territory">
        <Card size="sm">
          <CardHeader>
            <CardTitle id="operations-territory">{t("territory.title")}</CardTitle>
            <CardDescription>{t("territory.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TerritoryBreakdownTable
              territoryChildren={children}
              query={query}
              reportingMonth={reportingMonth}
            />
          </CardContent>
        </Card>
      </section>

      <OperationsShortcuts
        title={tHome("shortcutsTitle")}
        description={tHome("shortcutsDescription")}
        labels={{
          clubs: tHome("shortcuts.clubs"),
          users: tHome("shortcuts.users"),
          enrollments: tHome("shortcuts.enrollments"),
          assignments: tHome("shortcuts.assignments"),
          validations: tHome("shortcuts.validations"),
          reports: tHome("shortcuts.reports"),
          folders: tHome("shortcuts.folders"),
          activities: tHome("shortcuts.activities"),
          camporees: tHome("shortcuts.camporees"),
        }}
        items={resolveAccessibleShortcuts(user)}
      />

      <OperationsDataQuality
        title={t("dataQuality.title")}
        description={t("dataQuality.description")}
        entries={data_quality}
        statusLabels={{
          exact: t("dataQuality.status.exact"),
          current_affiliation: t("dataQuality.status.current_affiliation"),
          unavailable: t("dataQuality.status.unavailable"),
          not_applicable: t("dataQuality.status.not_applicable"),
        }}
      />
    </div>
  );
}
