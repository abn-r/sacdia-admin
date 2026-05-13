"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRoleLabel } from "@/lib/auth/role-labels";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RoleDistributionEntry } from "./role-distribution-chart";

type RoleVisualWeight = {
  fill: string;
  opacity: number;
};

const ROLE_WEIGHTS: Record<string, RoleVisualWeight> = {
  "super-admin": { fill: "var(--chart-1)", opacity: 1 },
  admin: { fill: "var(--chart-2)", opacity: 1 },
  "assistant-admin": { fill: "var(--chart-3)", opacity: 1 },
  coordinator: { fill: "var(--chart-4)", opacity: 1 },
  pastor: { fill: "var(--chart-5)", opacity: 1 },
  director: { fill: "var(--primary)", opacity: 0.65 },
  "deputy-director": { fill: "var(--primary)", opacity: 0.5 },
  secretary: { fill: "var(--muted-foreground)", opacity: 0.7 },
  treasurer: { fill: "var(--muted-foreground)", opacity: 0.55 },
  counselor: { fill: "var(--muted-foreground)", opacity: 0.45 },
  instructor: { fill: "var(--muted-foreground)", opacity: 0.4 },
  member: { fill: "var(--muted-foreground)", opacity: 0.35 },
  user: { fill: "var(--muted-foreground)", opacity: 0.3 },
};

const FALLBACK_WEIGHT: RoleVisualWeight = {
  fill: "var(--muted-foreground)",
  opacity: 0.25,
};

function weightFor(role: string): RoleVisualWeight {
  return ROLE_WEIGHTS[role] ?? FALLBACK_WEIGHT;
}

interface RoleDistributionChartInnerProps {
  data: RoleDistributionEntry[];
  sampleSize: number;
}

export function RoleDistributionChartInner({
  data,
  sampleSize,
}: RoleDistributionChartInnerProps) {
  const t = useTranslations("dashboardHub");
  const translateRole = useRoleLabel();

  const { rows, unassigned } = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.count - a.count);
    const unassignedEntry = sorted.find((e) => e.role === "sin_rol");
    const visibleRows = sorted.filter((e) => e.role !== "sin_rol");
    return {
      rows: visibleRows,
      unassigned: unassignedEntry ?? null,
    };
  }, [data]);

  if (rows.length === 0 && !unassigned) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("roleChart.noRolesFound")}
      </p>
    );
  }

  const maxPct = rows.reduce((max, e) => Math.max(max, e.percentage), 0);

  return (
    <div className="space-y-3">
      <ul role="list" className="space-y-1">
        {rows.map((entry) => {
          const label = translateRole(entry.role);
          const weight = weightFor(entry.role);
          const widthPct = maxPct > 0 ? (entry.percentage / maxPct) * 100 : 0;
          return (
            <Tooltip key={entry.role}>
              <TooltipTrigger asChild>
                <li
                  role="listitem"
                  tabIndex={0}
                  className="group grid h-9 grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-3 rounded-md px-2 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {label}
                  </span>
                  <span
                    className="relative h-2 overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full transition-[width] duration-300 ease-out"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: weight.fill,
                        opacity: weight.opacity,
                      }}
                    />
                  </span>
                  <span className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-sm font-semibold text-foreground">
                      {entry.count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.percentage.toFixed(0)}%
                    </span>
                  </span>
                </li>
              </TooltipTrigger>
              <TooltipContent side="left" align="center">
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground">
                  {t("roleChart.userCount", {
                    count: entry.count,
                    percentage: entry.percentage.toFixed(1),
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ul>

      {unassigned && unassigned.count > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <span
              className="size-1.5 rounded-full"
              style={{
                backgroundColor: "var(--muted-foreground)",
                opacity: 0.5,
              }}
              aria-hidden="true"
            />
            {t("roleChart.noRoleChip", {
              count: unassigned.count,
              percentage: unassigned.percentage.toFixed(0),
            })}
          </span>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {t("roleChart.basedOn", { count: sampleSize })}
      </p>
    </div>
  );
}
