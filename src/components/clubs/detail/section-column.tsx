"use client";

import { cn } from "@/lib/utils";

interface SectionColumnsGridProps {
  children: React.ReactNode;
  className?: string;
  layout?: "responsive" | "horizontal";
}

export function SectionColumnsGrid({
  children,
  className,
  layout = "responsive",
}: SectionColumnsGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        layout === "horizontal"
          ? "grid-cols-1 sm:grid-cols-3"
          : "lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface SectionColumnProps {
  title: string;
  accent?: string;
  countLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionColumn({
  title,
  accent,
  countLabel,
  children,
  className,
}: SectionColumnProps) {
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <header className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {accent ? (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
          ) : null}
          <h4 className="truncate text-sm font-medium text-foreground">{title}</h4>
        </div>
        {countLabel ? (
          <span className="shrink-0 text-xs text-muted-foreground">{countLabel}</span>
        ) : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
