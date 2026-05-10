"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import type { InvestiturePipelineItem } from "@/lib/api/analytics";

interface SlaPipelineChartInnerProps {
  pipeline: InvestiturePipelineItem[];
}

// Map each status to a semantic chart color token
const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "hsl(var(--chart-1, 220 70% 50%))",
  SUBMITTED_FOR_VALIDATION: "hsl(var(--chart-2, 160 60% 45%))",
  CLUB_APPROVED: "hsl(var(--chart-3, 30 80% 55%))",
  COORDINATOR_APPROVED: "hsl(var(--chart-4, 280 65% 60%))",
  FIELD_APPROVED: "hsl(var(--chart-5, 340 75% 55%))",
  APPROVED: "hsl(var(--primary))",
  REJECTED: "hsl(var(--destructive))",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? "hsl(var(--muted-foreground))";
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: InvestiturePipelineItem }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  const t = useTranslations("sla.pipeline");
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{entry.label}</p>
      <p className="text-muted-foreground">
        {entry.count.toLocaleString("es-MX")} {t("tooltip_enrollments", { count: entry.count })}
      </p>
    </div>
  );
}

export function SlaPipelineChartInner({ pipeline }: SlaPipelineChartInnerProps) {
  const t = useTranslations("sla.pipeline");
  const visiblePipeline = pipeline.filter((p) => p.count > 0 || p.status !== "FIELD_APPROVED");

  if (visiblePipeline.every((p) => p.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
          <CardDescription>{t("description_distribution")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={visiblePipeline}
            layout="vertical"
            margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={145}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {visiblePipeline.map((entry) => (
                <Cell key={entry.status} fill={statusColor(entry.status)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
