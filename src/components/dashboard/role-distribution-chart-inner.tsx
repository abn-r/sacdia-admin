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
import { useTranslations } from "next-intl";
import type { RoleDistributionEntry } from "./role-distribution-chart";

const ROLE_LABEL_KEYS: Record<string, string> = {
  "super-admin": "superAdmin",
  admin: "admin",
  "assistant-admin": "assistantAdmin",
  coordinator: "coordinator",
  pastor: "pastor",
  user: "user",
  director: "director",
  "deputy-director": "deputyDirector",
  secretary: "secretary",
  treasurer: "treasurer",
  counselor: "counselor",
  instructor: "instructor",
  member: "member",
  sin_rol: "noRole",
};

const ROLE_COLORS: Record<string, string> = {
  "super-admin": "var(--destructive)",
  admin: "var(--primary)",
  "assistant-admin": "color-mix(in oklch, var(--primary) 70%, transparent)",
  coordinator: "var(--info)",
  pastor: "var(--warning)",
  user: "var(--success)",
  director: "var(--chart-1)",
  "deputy-director": "var(--chart-2)",
  secretary: "var(--chart-3)",
  treasurer: "var(--chart-4)",
  counselor: "var(--chart-5)",
  instructor: "color-mix(in oklch, var(--chart-1) 60%, var(--chart-3) 40%)",
  member: "color-mix(in oklch, var(--muted-foreground) 80%, transparent)",
  sin_rol: "color-mix(in oklch, var(--muted-foreground) 50%, transparent)",
};

const DEFAULT_COLOR = "color-mix(in oklch, var(--muted-foreground) 40%, transparent)";

function roleColor(role: string): string {
  return ROLE_COLORS[role] ?? DEFAULT_COLOR;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RoleDistributionEntry }>;
  roleLabel: (role: string) => string;
  userCount: (count: number, percentage: string) => string;
}

function CustomTooltip({ active, payload, roleLabel, userCount }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{roleLabel(entry.role)}</p>
      <p className="text-muted-foreground">
        {userCount(entry.count, entry.percentage.toFixed(1))}
      </p>
    </div>
  );
}

interface RoleDistributionChartInnerProps {
  data: RoleDistributionEntry[];
  sampleSize: number;
}

export function RoleDistributionChartInner({ data, sampleSize }: RoleDistributionChartInnerProps) {
  const t = useTranslations("dashboardHub");

  function roleLabel(role: string): string {
    const key = ROLE_LABEL_KEYS[role];
    if (key) {
      return t(`roleLabels.${key}` as Parameters<typeof t>[0]);
    }
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function userCount(count: number, percentage: string): string {
    return t("roleChart.userCount", { count, percentage });
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("roleChart.noRolesFound")}
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
          <Tooltip
            content={
              <CustomTooltip
                roleLabel={roleLabel}
                userCount={userCount}
              />
            }
            cursor={{ fill: "color-mix(in oklch, var(--muted) 40%, transparent)" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {data.map((entry) => (
              <Cell key={entry.role} fill={roleColor(entry.role)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-[11px] text-muted-foreground">
        {t("roleChart.basedOn", { count: sampleSize })}
      </p>
    </div>
  );
}
