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
  assistant_admin: "Asist. Admin",
  coordinator: "Coordinador",
  pastor: "Pastor",
  user: "Usuario",
  director: "Director",
  deputy_director: "Subdirector",
  secretary: "Secretario",
  treasurer: "Tesorero",
  counselor: "Consejero",
  instructor: "Instructor",
  member: "Miembro",
  sin_rol: "Sin rol",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "var(--destructive)",
  admin: "var(--primary)",
  assistant_admin: "color-mix(in oklch, var(--primary) 70%, transparent)",
  coordinator: "var(--info)",
  pastor: "var(--warning)",
  user: "var(--success)",
  director: "var(--chart-1)",
  deputy_director: "var(--chart-2)",
  secretary: "var(--chart-3)",
  treasurer: "var(--chart-4)",
  counselor: "var(--chart-5)",
  instructor: "color-mix(in oklch, var(--chart-1) 60%, var(--chart-3) 40%)",
  member: "color-mix(in oklch, var(--muted-foreground) 80%, transparent)",
  sin_rol: "color-mix(in oklch, var(--muted-foreground) 50%, transparent)",
};

const DEFAULT_COLOR = "color-mix(in oklch, var(--muted-foreground) 40%, transparent)";

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
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "color-mix(in oklch, var(--muted) 40%, transparent)" }} />
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
