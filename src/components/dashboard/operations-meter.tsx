import { progressTone, type ProgressTone } from "@/lib/dashboard/operations-home";
import { cn } from "@/lib/utils";

// Darkened in light mode so the fill keeps contrast against the muted track (as StatusBadge does).
const TONE_FILL: Record<Exclude<ProgressTone, "none">, string> = {
  destructive: "bg-destructive",
  warning: "bg-[color-mix(in_oklch,var(--warning),black_25%)] dark:bg-warning",
  success: "bg-[color-mix(in_oklch,var(--success),black_15%)] dark:bg-success",
};

interface OperationsMeterProps {
  /** 0–100; `null` renders the empty track. */
  pct: number | null;
  className?: string;
}

/** Thin 4px progress bar. Decorative: the value is always printed next to it. */
export function OperationsMeter({ pct, className }: OperationsMeterProps) {
  const tone = progressTone(pct);
  const width = pct === null ? 0 : Math.min(100, Math.max(0, pct));

  return (
    <div
      aria-hidden
      data-slot="operations-meter"
      data-tone={tone}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      {tone === "none" ? null : (
        <div className={cn("h-full rounded-full", TONE_FILL[tone])} style={{ width: `${width}%` }} />
      )}
    </div>
  );
}
