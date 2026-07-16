"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationsBentoTileProps {
  title: string;
  value: string;
  subValue?: string;
  subValueTone?: "default" | "positive" | "warning";
  footer?: ReactNode;
  visual?: ReactNode;
  className?: string;
  href?: string;
  ariaLabel?: string;
}

export function OperationsBentoTile({
  title,
  value,
  subValue,
  subValueTone = "default",
  footer,
  visual,
  className,
  href,
  ariaLabel,
}: OperationsBentoTileProps) {
  const action = (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-foreground/5 transition-colors group-hover:bg-primary/10 group-hover:text-primary"
      aria-hidden
    >
      <ArrowRight className="size-4" />
    </span>
  );

  return (
    <article
      className={cn(
        "group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-3xl",
        "border border-foreground/5 bg-gradient-to-br from-card via-card to-muted/15",
        "p-5 shadow-sm ring-1 ring-foreground/5 sm:p-6",
        "motion-reduce:transition-none transition-shadow hover:shadow-md",
        className,
      )}
      aria-label={ariaLabel ?? title}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--chart-1)/0.08),transparent_55%)]" />

      <header className="relative z-10 flex items-start justify-between gap-3">
        <p className="font-medium text-muted-foreground text-sm">{title}</p>
        {href ? (
          <a href={href} className="pointer-events-auto rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {action}
          </a>
        ) : (
          action
        )}
      </header>

      <div className="relative z-10 mt-4 flex flex-1 flex-col">
        <p className="font-semibold text-3xl text-foreground tracking-tight tabular-nums sm:text-4xl">
          {value}
        </p>
        {subValue ? (
          <p
            className={cn(
              "mt-2 text-sm tabular-nums",
              subValueTone === "positive" && "text-[hsl(var(--chart-2))]",
              subValueTone === "warning" && "text-destructive",
              subValueTone === "default" && "text-muted-foreground",
            )}
          >
            {subValue}
          </p>
        ) : null}
        {footer ? <div className="mt-2 text-muted-foreground text-xs">{footer}</div> : null}

        {visual ? <div className="mt-auto pt-4">{visual}</div> : null}
      </div>
    </article>
  );
}

interface OperationsBentoMetricProps {
  label: string;
  value: string;
  className?: string;
}

export function OperationsBentoMetric({ label, value, className }: OperationsBentoMetricProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-semibold text-lg tabular-nums">{value}</p>
    </div>
  );
}
