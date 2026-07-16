"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DashboardMetricProgressProps {
  label: string;
  valueLabel: string;
  percent: number | null;
  className?: string;
}

export function DashboardMetricProgress({
  label,
  valueLabel,
  percent,
  className,
}: DashboardMetricProgressProps) {
  if (percent === null) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium tabular-nums">—</span>
        </div>
        <div className="h-3 rounded-full bg-muted/50" aria-hidden />
        <p className="text-muted-foreground text-xs">{valueLabel}</p>
      </div>
    );
  }

  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{valueLabel}</span>
      </div>
      <Progress value={clamped} aria-label={label} />
    </div>
  );
}
