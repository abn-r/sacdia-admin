"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PointsAllocationBarProps {
  label: string;
  allocated: number;
  total: number;
  className?: string;
}

export function PointsAllocationBar({
  label,
  allocated,
  total,
  className,
}: PointsAllocationBarProps) {
  const isBalanced = allocated === total && total > 0;
  const percentage = total > 0 ? Math.min((allocated / total) * 100, 100) : 0;
  const remaining = total - allocated;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        isBalanced
          ? "border-success/30 bg-success/10"
          : "border-warning/30 bg-warning/15",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isBalanced ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <AlertCircle className="size-4 text-warning dark:text-warning" />
          )}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="text-sm tabular-nums">
          <span className="font-semibold">{allocated.toLocaleString()}</span>
          <span className="text-muted-foreground">
            {" "}
            / {total.toLocaleString()} pts
          </span>
        </div>
      </div>

      <Progress
        value={percentage}
        className={cn(
          "mt-3 h-2.5",
          isBalanced ? "[&_[data-slot=progress-indicator]]:bg-success" : "[&_[data-slot=progress-indicator]]:bg-warning",
        )}
      />

      <p className="mt-2 text-xs text-muted-foreground">
        {isBalanced
          ? "Distribución completa. Todo listo para guardar."
          : remaining > 0
            ? `Faltan ${remaining.toLocaleString()} pts por asignar.`
            : `Hay ${Math.abs(remaining).toLocaleString()} pts de más.`}
      </p>
    </div>
  );
}
