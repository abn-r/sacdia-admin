import { progressTone, type ProgressTone } from "@/lib/dashboard/operations-home";
import { cn } from "@/lib/utils";

// Neutral by default; colour only below the risk thresholds (see progressTone).
const TONE_FILL: Record<Exclude<ProgressTone, "none">, string> = {
  destructive: "bg-destructive-solid",
  warning: "bg-warning-solid",
  neutral: "bg-foreground/70",
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
