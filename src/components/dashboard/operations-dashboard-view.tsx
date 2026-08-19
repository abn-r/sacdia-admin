import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { OperationsDashboardChrome } from "@/components/dashboard/operations-dashboard-chrome";
import { OperationsDashboardBento } from "@/components/dashboard/operations-dashboard-bento";
import { TerritoryBreakdownTable } from "@/components/dashboard/territory-breakdown-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type OperationsDashboardData,
  type OperationsDashboardDataQuality,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";

interface OperationsDashboardViewProps {
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

export async function OperationsDashboardView({ data, query }: OperationsDashboardViewProps) {
  const t = await getTranslations("dashboardHub.operations");
  const { meta, summary, children, data_quality } = data;
  const reportingMonth = meta.period.reporting_month;

  return (
    <div className="@container/main flex flex-col gap-5 md:gap-6">
      <OperationsDashboardChrome
        data={data}
        query={query}
        activeVersion="v1"
        title={t("title")}
        description={t("description")}
      />

      <OperationsDashboardBento summary={summary} reportingMonth={reportingMonth} />

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

      {data_quality.length > 0 ? (
        <section aria-labelledby="operations-data-quality">
          <Card size="sm">
            <CardHeader>
              <CardTitle id="operations-data-quality" className="flex items-center gap-2">
                <Info className="size-4" aria-hidden />
                {t("dataQuality.title")}
              </CardTitle>
              <CardDescription>{t("dataQuality.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {data_quality.map((entry) => (
                  <li key={entry.metric} className="rounded-xl border px-3 py-2">
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
      ) : null}
    </div>
  );
}
