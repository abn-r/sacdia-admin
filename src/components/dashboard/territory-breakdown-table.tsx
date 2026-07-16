import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import {
  buildDashboardHref,
  buildDrillDownQuery,
  formatMetricCount,
  formatMetricPercent,
  type OperationsDashboardChild,
  type OperationsDashboardQuery,
} from "@/lib/api/operations-dashboard";
import { getFormatNumber } from "@/lib/format-locale";

interface TerritoryBreakdownTableProps {
  territoryChildren: OperationsDashboardChild[];
  query: OperationsDashboardQuery;
  reportingMonth: { year: number; month: number } | null;
}

function formatPendingQueues(
  child: OperationsDashboardChild,
  formatNumber: (n: number) => string,
  labels: {
    role: string;
    transfers: string;
    classes: string;
    honors: string;
    folders: string;
  },
): string {
  const lines = [
    `${labels.role}: ${formatMetricCount(child.queues.role_assignments_pending, formatNumber)}`,
    `${labels.transfers}: ${formatMetricCount(child.queues.transfers_pending, formatNumber)}`,
    `${labels.classes}: ${formatMetricCount(child.queues.class_validations_pending, formatNumber)}`,
    `${labels.honors}: ${formatMetricCount(child.queues.honors_review_pending, formatNumber)}`,
    `${labels.folders}: ${formatMetricCount(child.queues.annual_folders_pending_union, formatNumber)}`,
  ];

  return lines.join(" · ");
}

export async function TerritoryBreakdownTable({
  territoryChildren,
  query,
  reportingMonth,
}: TerritoryBreakdownTableProps) {
  const t = await getTranslations("dashboardHub.operations.territory");
  const formatNumber = await getFormatNumber();

  if (territoryChildren.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnTerritory")}</TableHead>
            <TableHead className="text-right">{t("columnAdminClubs")}</TableHead>
            <TableHead className="text-right">{t("columnOperationalClubs")}</TableHead>
            <TableHead className="text-right">{t("columnPeople")}</TableHead>
            <TableHead className="text-right">{t("columnClasses")}</TableHead>
            <TableHead className="text-right">{t("columnCoverage")}</TableHead>
            <TableHead className="text-right">{t("columnActivities")}</TableHead>
            <TableHead className="text-right">{t("columnPending")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {territoryChildren.map((child) => {
            const coverage = reportingMonth
              ? formatMetricPercent(child.monthly_reports.coverage_pct, formatNumber)
              : "—";

            const nameCell =
              child.level === "club" ? (
                <Link
                  href={`/dashboard/clubs/${child.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {child.name}
                </Link>
              ) : (
                <Link
                  href={buildDashboardHref(buildDrillDownQuery(child, query))}
                  className="font-medium text-primary hover:underline"
                >
                  {child.name}
                </Link>
              );

            return (
              <TableRow key={`${child.level}-${child.id}`}>
                <TableCell>
                  <div className="space-y-0.5">
                    {nameCell}
                    <p className="text-muted-foreground text-xs">{t(`level.${child.level}`)}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetricCount(child.administrative_clubs.total, formatNumber)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetricCount(child.operations.operational_clubs, formatNumber)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetricCount(child.people.institutionally_active, formatNumber)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetricCount(child.classes.distinct_people, formatNumber)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{coverage}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMetricCount(child.activities.registered, formatNumber)}
                </TableCell>
                <TableCell className="max-w-xs text-right text-xs leading-relaxed">
                  {formatPendingQueues(child, formatNumber, {
                    role: t("pendingRole"),
                    transfers: t("pendingTransfers"),
                    classes: t("pendingClasses"),
                    honors: t("pendingHonors"),
                    folders: t("pendingFolders"),
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
