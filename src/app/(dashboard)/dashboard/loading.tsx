import type { CSSProperties } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";

function KpiSkeleton({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={style}
      className={`rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/10 ${STAGGER_CLASSES}`}
    >
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-2 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-40" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="@container/main flex flex-col gap-6">
      <div className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-24 w-full rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiSkeleton style={getStaggerStyle(0)} />
        <KpiSkeleton style={getStaggerStyle(1)} />
        <KpiSkeleton style={getStaggerStyle(2)} />
        <KpiSkeleton style={getStaggerStyle(3)} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
