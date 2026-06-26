"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type RoleDistributionEntry = {
  role: string;
  count: number;
  percentage: number;
};

function RoleDistributionLoading() {
  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="grid h-9 grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-3 px-2"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-12" />
          </li>
        ))}
      </ul>
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

const RoleDistributionChartInner = dynamic(
  () =>
    import("./role-distribution-chart-inner").then(
      (m) => m.RoleDistributionChartInner
    ),
  {
    ssr: false,
    loading: () => <RoleDistributionLoading />,
  }
);

interface RoleDistributionChartProps {
  data: RoleDistributionEntry[];
  sampleSize: number;
}

export function RoleDistributionChart({ data, sampleSize }: RoleDistributionChartProps) {
  return <RoleDistributionChartInner data={data} sampleSize={sampleSize} />;
}
