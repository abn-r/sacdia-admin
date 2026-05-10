"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type RoleDistributionEntry = {
  role: string;
  count: number;
  percentage: number;
};

const RoleDistributionChartInner = dynamic(
  () =>
    import("./role-distribution-chart-inner").then(
      (m) => m.RoleDistributionChartInner
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[160px] w-full rounded-md" />,
  }
);

interface RoleDistributionChartProps {
  data: RoleDistributionEntry[];
  sampleSize: number;
}

export function RoleDistributionChart({ data, sampleSize }: RoleDistributionChartProps) {
  return <RoleDistributionChartInner data={data} sampleSize={sampleSize} />;
}
