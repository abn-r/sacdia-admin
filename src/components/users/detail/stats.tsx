import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: ReactNode;
}

export function UserDetailStats({ items }: { items: StatItem[] }) {
  if (items.length === 0) return null;
  return (
    <div
      className={cn(
        "grid gap-3.5",
        items.length === 1 && "grid-cols-1",
        items.length === 2 && "grid-cols-1 sm:grid-cols-2",
        items.length === 3 && "grid-cols-1 sm:grid-cols-3",
        items.length >= 4 && "grid-cols-2 lg:grid-cols-4",
      )}
    >
      {items.map((it) => (
        <Card key={String(it.label)} className="gap-1 px-4 py-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {it.label}
          </div>
          <div className="text-[22px] font-semibold tracking-tight text-foreground">
            {it.value}
          </div>
          {it.sub ? (
            <div className="text-xs text-muted-foreground">{it.sub}</div>
          ) : null}
          {it.accent ? <div className="mt-2">{it.accent}</div> : null}
        </Card>
      ))}
    </div>
  );
}

export function ProgressBar({ pct, tone = "primary" }: { pct: number; tone?: "primary" | "success" | "warning" }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const bar =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
      ? "bg-warning"
      : "bg-gradient-to-r from-primary to-warning";
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full", bar)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
