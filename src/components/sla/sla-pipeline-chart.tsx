"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvestiturePipelineItem } from "@/lib/api/analytics";

export interface SlaPipelineChartProps {
  pipeline: InvestiturePipelineItem[];
}

function SlaPipelineChartSkeleton() {
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

const SlaPipelineChartInner = dynamic(
  () =>
    import("./sla-pipeline-chart-inner").then((m) => m.SlaPipelineChartInner),
  {
    ssr: false,
    loading: () => <SlaPipelineChartSkeleton />,
  }
);

export function SlaPipelineChart({ pipeline }: SlaPipelineChartProps) {
  return <SlaPipelineChartInner pipeline={pipeline} />;
}
