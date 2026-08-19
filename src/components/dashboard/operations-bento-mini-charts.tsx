"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const CHART_COLORS = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  muted: "hsl(var(--muted-foreground) / 0.25)",
  success: "hsl(var(--chart-2))",
  warning: "hsl(var(--destructive) / 0.85)",
} as const;

type SplitSegment = { key: string; label: string; value: number; color?: string };

export function BentoSplitBar({
  segments,
  className,
}: {
  segments: SplitSegment[];
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  if (total <= 0) {
    return (
      <div
        className={cn("h-3 w-full rounded-full bg-muted/40", className)}
        aria-hidden
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {segments.map((segment) => {
          const pct = Math.round((segment.value / total) * 100);
          return (
            <span key={segment.key} className="text-muted-foreground">
              <span
                className="mr-1 inline-block size-2 rounded-full"
                style={{ backgroundColor: segment.color ?? CHART_COLORS.primary }}
                aria-hidden
              />
              {segment.label}{" "}
              <span className="text-foreground/80">{pct}%</span>
            </span>
          );
        })}
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/30">
        {segments.map((segment) => {
          const width = (Math.max(0, segment.value) / total) * 100;
          if (width <= 0) return null;
          return (
            <div
              key={segment.key}
              className="h-full"
              style={{
                width: `${width}%`,
                backgroundColor: segment.color ?? CHART_COLORS.primary,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function BentoPillMeter({
  items,
  className,
}: {
  items: Array<{ key: string; value: number }>;
  className?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={cn("flex items-end gap-1.5", className)} aria-hidden>
      {items.map((item) => {
        const filled = item.value > 0;
        const height = Math.max(28, Math.round((item.value / max) * 72));
        return (
          <div
            key={item.key}
            className={cn(
              "w-2.5 rounded-full",
              filled ? "bg-[hsl(var(--chart-1))]" : "bg-muted/40",
            )}
            style={{ height }}
          />
        );
      })}
    </div>
  );
}

export function BentoAreaSparkline({
  points,
  className,
}: {
  points: Array<{ label: string; value: number }>;
  className?: string;
}) {
  const config: ChartConfig = {
    value: { label: "Value", color: CHART_COLORS.success },
  };

  if (points.every((p) => p.value === 0)) {
    return <div className={cn("h-20 rounded-xl bg-muted/20", className)} aria-hidden />;
  }

  return (
    <ChartContainer config={config} className={cn("h-20 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bentoSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.success} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART_COLORS.success}
            strokeWidth={2}
            fill="url(#bentoSparkFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function BentoBarChart({
  items,
  highlightKey,
  className,
}: {
  items: Array<{ key: string; label: string; value: number }>;
  highlightKey?: string;
  className?: string;
}) {
  const config: ChartConfig = {
    value: { label: "Value", color: CHART_COLORS.primary },
  };

  return (
    <ChartContainer config={config} className={cn("h-28 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            interval={0}
          />
          <YAxis hide domain={[0, "dataMax"]} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {items.map((item) => (
              <Cell
                key={item.key}
                fill={
                  item.key === highlightKey
                    ? CHART_COLORS.primary
                    : CHART_COLORS.muted
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function BentoDonut({
  segments,
  className,
}: {
  segments: Array<{ key: string; label: string; value: number; color: string }>;
  className?: string;
}) {
  const data = segments.filter((s) => s.value > 0);
  const config: ChartConfig = Object.fromEntries(
    segments.map((s) => [s.key, { label: s.label, color: s.color }]),
  );

  if (data.length === 0) {
    return (
      <div
        className={cn("flex h-28 items-center justify-center text-muted-foreground text-xs", className)}
      >
        —
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <ChartContainer config={config} className="mx-auto h-28 w-full max-w-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {segments.map((segment) => {
          const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
          const pct = total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <span key={segment.key}>
              <span
                className="mr-1 inline-block size-2 rounded-full"
                style={{ backgroundColor: segment.color }}
                aria-hidden
              />
              {segment.label}: {pct}%
            </span>
          );
        })}
      </div>
    </div>
  );
}
