"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { GraduationCap } from "lucide-react";
import type { ClassBreakdownItem } from "@/lib/api/operations-dashboard";
import { useFormatNumber } from "@/lib/format-locale";

interface ClassEnrollmentsChartProps {
  items: ClassBreakdownItem[];
  showTable?: boolean;
  compact?: boolean;
  colored?: boolean;
}

function buildChartLabel(item: ClassBreakdownItem): string {
  return `${item.class_name} (${item.club_type_name})`;
}

export function ClassEnrollmentsChart({
  items,
  showTable = true,
  compact = false,
  colored = false,
}: ClassEnrollmentsChartProps) {
  const t = useTranslations("dashboardHub.operations.formation");
  const formatNumber = useFormatNumber();

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.display_order - b.display_order || a.class_id - b.class_id),
    [items],
  );

  const chartData = useMemo(
    () =>
      sorted.map((item) => ({
        key: `${item.class_id}-${item.club_type_id}`,
        label: buildChartLabel(item),
        enrollments: item.enrollment_count,
        className: item.class_name,
        clubType: item.club_type_name,
      })),
    [sorted],
  );

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      enrollments: {
        label: t("chartSeries"),
        color: "hsl(var(--chart-1))",
      },
    }),
    [t],
  );

  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      <div
        className="motion-reduce:transition-none"
        aria-label={t("chartAriaLabel")}
        role="img"
      >
        <ChartContainer
          config={chartConfig}
          className={
            compact
              ? "aspect-auto h-[min(200px,28vh)] w-full"
              : "aspect-auto h-[min(420px,60vh)] w-full"
          }
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="label"
              type="category"
              width={compact ? 110 : 180}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: compact ? 9 : 11 }}
            />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatNumber(Number(value))}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                    return row?.label ?? "";
                  }}
                />
              }
            />
            <Bar
              dataKey="enrollments"
              fill="var(--color-enrollments)"
              radius={[0, compact ? 3 : 4, compact ? 3 : 4, 0]}
              name={t("chartSeries")}
            >
              {colored
                ? chartData.map((row, index) => (
                    <Cell key={row.key} fill={chartColors[index % chartColors.length]} />
                  ))
                : null}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>

      {showTable ? (
      <div>
        <h3 className="mb-2 font-medium text-sm">{t("tableTitle")}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableClass")}</TableHead>
              <TableHead>{t("tableClubType")}</TableHead>
              <TableHead className="text-right">{t("tableEnrollments")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item) => (
              <TableRow key={`${item.class_id}-${item.club_type_id}`}>
                <TableCell>{item.class_name}</TableCell>
                <TableCell>{item.club_type_name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(item.enrollment_count)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      ) : null}
    </div>
  );
}
