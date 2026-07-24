import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeft, CalendarRange, Info, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsDashboardBento } from "@/components/dashboard/operations-dashboard-bento";
import { DashboardVersionSwitch } from "@/components/dashboard/dashboard-version-switch";
import { TerritoryBreakdownTable } from "@/components/dashboard/territory-breakdown-table";
import {
  buildDashboardHref,
  buildResetScopeQuery,
  type OperationsDashboardData,
  type OperationsDashboardDataQuality,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";
import { formatDate, formatDateTime } from "@/lib/format-locale";

interface OperationsDashboardViewProps {
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

export async function OperationsDashboardView({ data, query }: OperationsDashboardViewProps) {
  const t = await getTranslations("dashboardHub.operations");
  const locale = await getLocale();
  const { meta, summary, children, data_quality } = data;
  const reportingMonth = meta.period.reporting_month;
  const breadcrumbText = scopeBreadcrumbLabels(data).join(" › ") || meta.scope.name;
  const resetHref = buildDashboardHref(buildResetScopeQuery(query));
  const hasTerritorialFilter = Boolean(query.division_id || query.union_id || query.local_field_id);

  const monthLabel = reportingMonth
    ? formatDate(new Date(reportingMonth.year, reportingMonth.month - 1, 1), locale, {
        month: "long",
        year: "numeric",
      })
    : t("noClosedMonth");

  return (
    <div className="@container/main flex flex-col gap-6 md:gap-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardVersionSwitch query={query} active="v1" />
            {hasTerritorialFilter ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={resetHref}>
                  <ArrowLeft className="mr-2 size-4" aria-hidden />
                  {t("backToMyScope")}
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
            {t("currentScope")}: {meta.scope.name}
          </Badge>
          {meta.cached && (
            <Badge variant="outline" className="text-muted-foreground">
              {t("cachedResponse")}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-xs" aria-label={t("breadcrumbLabel")}>
          {breadcrumbText}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground text-xs">
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="size-3.5" aria-hidden />
            {t("ecclesiasticalYear")}:{" "}
            {formatDate(meta.period.ecclesiastical_year.start_date, locale)} –{" "}
            {formatDate(meta.period.ecclesiastical_year.end_date, locale)}
          </span>
          <span>
            {t("reportingMonth")}: {monthLabel}
          </span>
          <time dateTime={meta.computed_at} className="text-muted-foreground">
            {t("computedAt", {
              date: formatDateTime(meta.computed_at, locale),
            })}
          </time>
        </div>
      </div>

      <OperationsDashboardBento summary={summary} reportingMonth={reportingMonth} />

      <section aria-labelledby="operations-territory">
        <Card>
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

      {data_quality.length > 0 && (
        <section aria-labelledby="operations-data-quality">
          <Card>
            <CardHeader>
              <CardTitle id="operations-data-quality" className="flex items-center gap-2">
                <Info className="size-4" aria-hidden />
                {t("dataQuality.title")}
              </CardTitle>
              <CardDescription>{t("dataQuality.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {data_quality.map((entry) => (
                  <li
                    key={entry.metric}
                    className="rounded-xl border px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{entry.metric}</span>
                      <Badge variant={qualityBadgeVariant(entry.status)}>
                        {t(`dataQuality.status.${entry.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">{entry.note}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
