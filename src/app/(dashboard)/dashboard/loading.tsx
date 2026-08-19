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

function ModuleSkeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`rounded-2xl bg-card p-4 ring-1 ring-foreground/10 ${className ?? ""} ${STAGGER_CLASSES}`}
    >
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-2 h-3 w-52 max-w-full" />
      <Skeleton className="mt-4 h-24 w-full rounded-xl" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="@container/main flex flex-col gap-5 md:gap-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-52 rounded-4xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiSkeleton style={getStaggerStyle(0)} />
        <KpiSkeleton style={getStaggerStyle(1)} />
        <KpiSkeleton style={getStaggerStyle(2)} />
        <KpiSkeleton style={getStaggerStyle(3)} />
      </div>

      <div
        data-bento-grid="operations-dashboard"
        className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3"
      >
        <ModuleSkeleton className="xl:col-span-2" style={getStaggerStyle(4)} />
        <ModuleSkeleton style={getStaggerStyle(5)} />
        <ModuleSkeleton style={getStaggerStyle(6)} />
        <ModuleSkeleton className="xl:col-span-2" style={getStaggerStyle(7)} />
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
