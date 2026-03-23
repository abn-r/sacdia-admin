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

export type RoleDistributionEntry = {
  role: string;
  count: number;
  percentage: number;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  user: "Usuario",
  club_director: "Director",
  club_secretary: "Secretario",
  club_treasurer: "Tesorero",
  instructor: "Instructor",
  staff: "Staff",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "hsl(var(--destructive))",
  admin: "hsl(var(--primary))",
  user: "hsl(var(--muted-foreground))",
  club_director: "hsl(var(--chart-1, 220 70% 50%))",
  club_secretary: "hsl(var(--chart-2, 160 60% 45%))",
  club_treasurer: "hsl(var(--chart-3, 30 80% 55%))",
  instructor: "hsl(var(--chart-4, 280 65% 60%))",
  staff: "hsl(var(--chart-5, 340 75% 55%))",
};

const DEFAULT_COLOR = "hsl(var(--primary) / 0.6)";

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleColor(role: string): string {
  return ROLE_COLORS[role] ?? DEFAULT_COLOR;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RoleDistributionEntry }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{roleLabel(entry.role)}</p>
      <p className="text-muted-foreground">
        {entry.count} usuario{entry.count !== 1 ? "s" : ""} &mdash; {entry.percentage.toFixed(1)}%
      </p>
    </div>
  );
}

interface RoleDistributionChartProps {
  data: RoleDistributionEntry[];
  sampleSize: number;
}

export function RoleDistributionChart({ data, sampleSize }: RoleDistributionChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No se encontraron roles asignados en la muestra.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="role"
            tickFormatter={roleLabel}
            width={80}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((entry) => (
              <Cell key={entry.role} fill={roleColor(entry.role)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-muted-foreground">
        Basado en los últimos {sampleSize} usuarios registrados
      </p>
    </div>
  );
}
