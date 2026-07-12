"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Cell, Label, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { SectionView } from "./types";

interface CompositionDonutProps {
  sections: SectionView[];
  total: number;
}

export function CompositionDonut({ sections, total }: CompositionDonutProps) {
  const t = useTranslations("clubs.detail.overview");

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const section of sections) {
      config[section.kind] = {
        label: section.label,
        color: section.meta.donutHex,
      };
    }
    if (total === 0) {
      config.empty = { label: t("membersCenterLabel"), color: "var(--muted)" };
    }
    return config;
  }, [sections, total, t]);

  const chartData = useMemo(() => {
    if (total === 0) {
      return [{ kind: "empty", members: 1, fill: "var(--color-empty)" }];
    }
    return sections
      .filter((s) => s.members > 0)
      .map((s) => ({
        kind: s.kind,
        label: s.label,
        members: s.members,
        fill: `var(--color-${s.kind})`,
      }));
  }, [sections, total]);

  const safeTotal = Math.max(total, 1);

  return (
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,200px)_1fr]">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square h-48 w-full max-w-48">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="members"
            nameKey="kind"
            innerRadius={58}
            outerRadius={76}
            strokeWidth={2}
            stroke="var(--background)"
          >
            {chartData.map((entry) => (
              <Cell key={entry.kind} fill={entry.fill} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-3xl font-semibold"
                    >
                      {total}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 18}
                      className="fill-muted-foreground text-[10px] font-medium uppercase tracking-widest"
                    >
                      {t("membersCenterLabel")}
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="grid gap-1">
        {sections.length === 0 && (
          <li className="text-sm text-muted-foreground">{t("noSectionsYet")}</li>
        )}
        {sections.map((s) => {
          const pct = total > 0 ? Math.round((s.members / safeTotal) * 100) : 0;
          return (
            <li
              key={s.kind + (s.sectionId ?? "")}
              className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
            >
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: s.meta.donutHex }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {s.label}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {s.range} · {s.unitsCount}u
                </div>
              </div>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {pct}%
              </span>
              <span className="text-sm font-medium tabular-nums text-foreground">
                {s.members}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
