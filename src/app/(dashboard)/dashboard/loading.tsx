import type { CSSProperties } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGGER_CLASSES, getStaggerStyle } from "@/lib/animations";

function BentoTileSkeleton({
  className,
  style,
  tall,
}: {
  className?: string;
  style?: CSSProperties;
  tall?: boolean;
}) {
  return (
    <div
      style={style}
      className={`flex min-h-[220px] flex-col gap-4 rounded-3xl border border-foreground/5 bg-gradient-to-br from-card via-card to-muted/15 p-5 ring-1 ring-foreground/5 sm:p-6 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className={tall ? "mt-auto h-28 w-full rounded-2xl" : "mt-auto h-16 w-full rounded-2xl"} />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="@container/main flex flex-col gap-6 md:gap-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-3 w-72" />
      </div>

      <div
        data-bento-grid="operations-dashboard"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <BentoTileSkeleton className={STAGGER_CLASSES} style={getStaggerStyle(0, 40)} />
        <BentoTileSkeleton className={STAGGER_CLASSES} style={getStaggerStyle(1, 40)} />
        <BentoTileSkeleton className={`sm:col-span-2 ${STAGGER_CLASSES}`} style={getStaggerStyle(2, 40)} tall />
        <BentoTileSkeleton className={STAGGER_CLASSES} style={getStaggerStyle(3, 40)} />
        <BentoTileSkeleton className={STAGGER_CLASSES} style={getStaggerStyle(4, 40)} />
        <BentoTileSkeleton className={`sm:col-span-2 ${STAGGER_CLASSES}`} style={getStaggerStyle(5, 40)} tall />
        <BentoTileSkeleton className={STAGGER_CLASSES} style={getStaggerStyle(6, 40)} />
        <BentoTileSkeleton className={STAGGER_CLASSES} style={getStaggerStyle(7, 40)} />
        <BentoTileSkeleton className={`sm:col-span-2 ${STAGGER_CLASSES}`} style={getStaggerStyle(8, 40)} />
      </div>

      <div className="rounded-3xl bg-card p-5 ring-1 ring-foreground/5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}
