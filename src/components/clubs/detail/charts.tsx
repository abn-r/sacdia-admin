"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type {
  AttendanceDataPoint,
  ClubScore,
  ScoreBreakdownItem,
} from "@/lib/api/club-detail";

interface AttendanceChartProps {
  series: AttendanceDataPoint[];
}

export function AttendanceChart({ series }: AttendanceChartProps) {
  const t = useTranslations("clubs.detail.overview");

  const chartData = useMemo(() => {
    const recent = series.slice(-12);
    return recent.map((point) => ({
      weekLabel: `S${point.week}`,
      avg_pct: Math.round(point.avg_pct),
      year: point.year,
      week: point.week,
    }));
  }, [series]);

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("attendanceEmptyTitle")}</p>
    );
  }

  return (
    <ChartContainer
      config={{
        avg_pct: {
          label: t("attendanceSeriesLabel"),
          color: "var(--chart-1)",
        },
      }}
      className="aspect-auto h-64 w-full"
    >
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.5} />
        <XAxis
          dataKey="weekLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
        />
        <YAxis
          hide
          domain={[0, 100]}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.35 }}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">{value}%</span>
              )}
            />
          }
        />
        <Bar
          dataKey="avg_pct"
          fill="var(--color-avg_pct)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ChartContainer>
  );
}

interface ScoreCircleProps {
  score: ClubScore;
}

export function ScoreCircle({ score }: ScoreCircleProps) {
  const value = Math.max(0, Math.min(100, score.value));
  const R = 40;
  const C = 2 * Math.PI * R;
  const dash = (value / 100) * C;

  const tone = value >= 75 ? "success" : value >= 50 ? "warning" : "destructive";
  const stroke =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : "var(--color-destructive)";

  return (
    <div className="relative mx-auto h-24 w-24">
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="10"
        />
        <circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {Math.round(value)}
          </div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {score.grade}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScoreBreakdownProps {
  items: ScoreBreakdownItem[];
}

export function ScoreBreakdown({ items }: ScoreBreakdownProps) {
  const t = useTranslations("clubs.detail.overview");

  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("scoreNoBreakdown")}</p>
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-foreground">{item.label}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {Math.round(item.value_pct)}% · w{(item.weight * 100).toFixed(0)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full bg-chart-1")}
              style={{ width: `${Math.min(100, item.value_pct)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
