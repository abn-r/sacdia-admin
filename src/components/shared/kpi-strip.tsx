import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MeterTone = "neutral" | "warning" | "destructive";

const METER_FILL: Record<MeterTone, string> = {
  neutral: "bg-foreground/70",
  warning: "bg-warning-solid",
  destructive: "bg-destructive-solid",
};

export interface KpiStripProps {
  children: ReactNode;
  className?: string;
  /**
   * Breakpoint from which the strip becomes one row. Default `sm`; use `xl`
   * when the cells hold long figures (5+ money amounts) that would not fit.
   */
  rowFrom?: "sm" | "xl";
  /** Accessible name of the group. */
  "aria-label"?: string;
}

/**
 * KPIs as type, not tiles: one container split by hairlines into equal columns.
 * 2 columns (an odd last cell spans both) until `rowFrom` (`sm` by default): then one row, equal columns.
 */
const ROW_CLASSES: Record<NonNullable<KpiStripProps["rowFrom"]>, string> = {
  sm: cn(
    "sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none",
    "sm:[&>*]:border-t-0 sm:[&>*:nth-child(odd)]:border-l",
    "[&>*:first-child]:sm:border-l-0 sm:[&>*:nth-child(-n+2)]:border-t-0",
    "sm:[&>*:last-child:nth-child(odd)]:col-span-1",
  ),
  xl: cn(
    "xl:grid-flow-col xl:auto-cols-fr xl:grid-cols-none",
    "xl:[&>*]:border-t-0 xl:[&>*:nth-child(odd)]:border-l",
    "[&>*:first-child]:xl:border-l-0 xl:[&>*:nth-child(-n+2)]:border-t-0",
    "xl:[&>*:last-child:nth-child(odd)]:col-span-1",
  ),
};

export function KpiStrip({ children, className, rowFrom = "sm", ...rest }: KpiStripProps) {
  return (
    <div
      role="list"
      data-slot="kpi-strip"
      aria-label={rest["aria-label"]}
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-card",
        // Hairlines: every cell paints a top/left rule, the container's overflow clips the outer ones.
        "[&>*]:border-border [&>*]:border-t [&>*]:border-l",
        "[&>*:nth-child(odd)]:border-l-0 [&>*:nth-child(-n+2)]:border-t-0",
        "[&>*:last-child:nth-child(odd)]:col-span-2",
        ROW_CLASSES[rowFrom],
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface KpiStripItemProps {
  label: ReactNode;
  value: ReactNode;
  /** Muted text printed after the value ("/ 12", "h"). */
  unit?: ReactNode;
  subline?: ReactNode;
  /** The figure that answers the screen's question: slightly larger. */
  emphasis?: boolean;
  meter?: { value: number | null; tone?: MeterTone };
  /** Value colour class, e.g. "text-destructive". Neutral by default. */
  valueClassName?: string;
  /** Makes the whole cell a link. */
  href?: string;
  "data-kpi"?: string;
  className?: string;
}

export function KpiStripItem({
  label,
  value,
  unit,
  subline,
  emphasis = false,
  meter,
  valueClassName,
  href,
  className,
  ...rest
}: KpiStripItemProps) {
  const width = meter?.value == null ? 0 : Math.min(100, Math.max(0, meter.value));
  const inner = (
    <>
      <p className="truncate text-muted-foreground text-xs sm:text-sm">{label}</p>
      <p
        className={cn(
          "mt-1 font-semibold tabular-nums tracking-tight",
          emphasis ? "text-3xl" : "text-2xl",
          valueClassName,
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 font-normal text-base text-muted-foreground">{unit}</span>
        ) : null}
      </p>
      {meter ? (
        <div
          aria-hidden
          data-slot="kpi-strip-meter"
          data-tone={meter.tone ?? "neutral"}
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn("h-full rounded-full", METER_FILL[meter.tone ?? "neutral"])}
            style={{ width: `${width}%` }}
          />
        </div>
      ) : null}
      {subline ? (
        <p className="mt-1 text-muted-foreground text-xs">{subline}</p>
      ) : null}
    </>
  );
  const cell = "flex h-full min-w-0 flex-col px-4 py-3.5";

  return (
    <div
      role="listitem"
      data-slot="kpi-strip-item"
      data-kpi={rest["data-kpi"]}
      className={cn("min-w-0", className)}
    >
      {href ? (
        <Link
          href={href}
          className={cn(
            cell,
            "outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset motion-reduce:transition-none",
          )}
        >
          {inner}
        </Link>
      ) : (
        <div className={cell}>{inner}</div>
      )}
    </div>
  );
}
