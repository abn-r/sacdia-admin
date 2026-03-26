"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ThroughputWeek } from "@/lib/api/analytics";

interface SlaThroughputChartProps {
  throughput: ThroughputWeek[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-xs text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="text-sm">
          {entry.name === "approved" ? "Aprobados" : "Rechazados"}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function SlaThroughputChart({ throughput }: SlaThroughputChartProps) {
  if (throughput.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Throughput — Ultimas 12 semanas</CardTitle>
          <CardDescription>Investiduras aprobadas y rechazadas por semana</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay datos de throughput disponibles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Throughput — Ultimas 12 semanas</CardTitle>
        <CardDescription>Investiduras aprobadas y rechazadas por semana</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={throughput}
            margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={10}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">
                  {value === "approved" ? "Aprobados" : "Rechazados"}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="approved"
              stroke="hsl(var(--chart-2, 160 60% 45%))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--chart-2, 160 60% 45%))" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="rejected"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--destructive))" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
