import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowLeft, CalendarClock, CalendarRange, Clock, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardVersionSwitch } from "@/components/dashboard/dashboard-version-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  buildDashboardHref,
  buildResetScopeQuery,
  type OperationsDashboardData,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";
import { formatDate, formatDateTime } from "@/lib/format-locale";

interface OperationsDashboardChromeProps {
  data: OperationsDashboardData;
  query: OperationsDashboardQuery;
  activeVersion: "v1" | "v2";
  title: string;
  description: string;
}

function scopePathLabels(data: OperationsDashboardData): string[] {
  const labels = data.meta.scope.path.map((node) => node.name);
  if (data.meta.scope.level !== "all") {
    labels.push(data.meta.scope.name);
  }
  return labels;
}

export async function OperationsDashboardChrome({
  data,
  query,
  activeVersion,
  title,
  description,
}: OperationsDashboardChromeProps) {
  const t = await getTranslations("dashboardHub.operations");
  const locale = await getLocale();
  const { meta } = data;
  const reportingMonth = meta.period.reporting_month;
  const pathLabels = scopePathLabels(data);
  const breadcrumbText = pathLabels.join(" › ");
  const showBreadcrumb =
    breadcrumbText.length > 0 && breadcrumbText !== meta.scope.name;
  const resetHref = buildDashboardHref(buildResetScopeQuery(query));
  const hasTerritorialFilter = Boolean(
    query.division_id || query.union_id || query.local_field_id,
  );

  const monthLabel = reportingMonth
    ? formatDate(new Date(reportingMonth.year, reportingMonth.month - 1, 1), locale, {
        month: "long",
        year: "numeric",
      })
    : t("noClosedMonth");

  const yearRange = `${formatDate(meta.period.ecclesiastical_year.start_date, locale)} - ${formatDate(meta.period.ecclesiastical_year.end_date, locale)}`;

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DashboardVersionSwitch query={query} active={activeVersion} />
            {hasTerritorialFilter ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={resetHref}>
                  <ArrowLeft className="size-4" aria-hidden />
                  {t("backToMyScope")}
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground text-xs">
        <Badge variant="secondary" className="gap-1 font-medium">
          <MapPin className="size-3" aria-hidden />
          {t("currentScope")}: {meta.scope.name}
        </Badge>
        {meta.cached ? (
          <Badge variant="outline" className="text-muted-foreground">
            {t("cachedResponse")}
          </Badge>
        ) : null}
        {showBreadcrumb ? (
          <span aria-label={t("breadcrumbLabel")}>{breadcrumbText}</span>
        ) : null}

        <Separator orientation="vertical" className="hidden h-4 sm:block" />

        <span className="inline-flex items-center gap-1.5">
          <CalendarRange className="size-3.5 shrink-0" aria-hidden />
          <span>
            {t("ecclesiasticalYear")} {yearRange}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          <span>
            {t("reportingMonth")}: {monthLabel}
          </span>
        </span>
        <time dateTime={meta.computed_at} className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          {t("computedAt", { date: formatDateTime(meta.computed_at, locale) })}
        </time>
      </div>
    </div>
  );
}
