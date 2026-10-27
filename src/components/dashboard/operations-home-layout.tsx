import {
  ClassEnrollmentsChart,
  type ClassEnrollmentsChartProps,
} from "@/components/dashboard/class-enrollments-chart";
import {
  OperationsDataQuality,
  type OperationsDataQualityProps,
} from "@/components/dashboard/operations-data-quality";
import {
  OperationsGapTable,
  type OperationsGapTableProps,
} from "@/components/dashboard/operations-gap-table";
import {
  OperationsKpiRow,
  type OperationsKpiRowProps,
} from "@/components/dashboard/operations-kpi-row";
import {
  OperationsSecondaryStats,
  type OperationsSecondaryStatsProps,
} from "@/components/dashboard/operations-secondary-stats";
import {
  OperationsWorkQueue,
  type OperationsWorkQueueProps,
} from "@/components/dashboard/operations-work-queue";
import { homeSectionOrder, type HomeMode } from "@/lib/dashboard/operations-home";
import { cn } from "@/lib/utils";

export interface OperationsHomeLayoutProps {
  mode: HomeMode;
  kpis: OperationsKpiRowProps;
  breakdown: OperationsGapTableProps;
  attention: OperationsWorkQueueProps;
  formation: ClassEnrollmentsChartProps;
  stats: OperationsSecondaryStatsProps;
  dataQuality: OperationsDataQualityProps;
}

export function OperationsHomeLayout({
  mode,
  kpis,
  breakdown,
  attention,
  formation,
  stats,
  dataQuality,
}: OperationsHomeLayoutProps) {
  const order = homeSectionOrder(mode);

  return (
    <div className="flex flex-col gap-6">
      <OperationsKpiRow {...kpis} />
      <div
        data-home-mode={mode}
        className={cn(
          "grid items-start gap-6 lg:gap-3",
          // The breakdown table always gets the wider track.
          order[0] === "breakdown"
            ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]",
        )}
      >
        {order.map((section) =>
          section === "breakdown" ? (
            <OperationsGapTable key={section} {...breakdown} />
          ) : (
            <OperationsWorkQueue key={section} {...attention} />
          ),
        )}
      </div>
      <ClassEnrollmentsChart {...formation} />
      <div className="flex flex-col gap-3">
        <OperationsSecondaryStats {...stats} />
        <OperationsDataQuality {...dataQuality} />
      </div>
    </div>
  );
}
