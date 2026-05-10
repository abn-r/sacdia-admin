"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThroughputWeek } from "@/lib/api/analytics";

export interface SlaThroughputChartProps {
  throughput: ThroughputWeek[];
}

function SlaThroughputChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

const SlaThroughputChartInner = dynamic(
  () =>
    import("./sla-throughput-chart-inner").then(
      (m) => m.SlaThroughputChartInner
    ),
  {
    ssr: false,
    loading: () => <SlaThroughputChartSkeleton />,
  }
);

export function SlaThroughputChart({ throughput }: SlaThroughputChartProps) {
  return <SlaThroughputChartInner throughput={throughput} />;
}
