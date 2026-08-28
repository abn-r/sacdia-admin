"use client";

import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { ClassEnrollmentsChart } from "@/components/dashboard/class-enrollments-chart";
import { BentoSplitBar } from "@/components/dashboard/operations-bento-mini-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  ClassBreakdownItem,
  DashboardMetrics,
  OperationsDashboardChild,
} from "@/lib/api/operations-dashboard";
import { useFormatNumber } from "@/lib/format-locale";
import { cn } from "@/lib/utils";

const C = {
  c1: "hsl(var(--chart-1))",
  c2: "hsl(var(--chart-2))",
  c3: "hsl(var(--chart-3))",
  c4: "hsl(var(--chart-4))",
  c5: "hsl(var(--chart-5))",
  danger: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground) / 0.28)",
} as const;

export type OperationsV2ChartLabels = {
  operationTitle: string;
  operationDescription: string;
  complianceTitle: string;
  complianceDescription: string;
  complianceNotApplicable: string;
  peopleTitle: string;
  peopleDescription: string;
  formationTitle: string;
  formationDescription: string;
  formationEmpty: string;
  honorsTitle: string;
  honorsDescription: string;
  honorsUnavailable: string;
  activitiesTitle: string;
  activitiesDescription: string;
  queuesTitle: string;
  queuesDescription: string;
  territoryTitle: string;
  territoryDescription: string;
  operationalRate: string;
  coverage: string;
  operationalClubs: string;
  nonOperationalClubs: string;
  adminActive: string;
  adminInactive: string;
  institutional: string;
  platformActive: string;
  platformInactive: string;
  submitted: string;
  draft: string;
  generated: string;
  missing: string;
  expected: string;
  registered: string;
  joint: string;
  sections: string;
  honorsInProgress: string;
  honorsPending: string;
  honorsApproved: string;
  queueRoles: string;
  queueTransfers: string;
  queueClasses: string;
  queueHonors: string;
  queueFolders: string;
  territoryOperational: string;
  territoryMissing: string;
  territoryPeople: string;
};

interface OperationsDashboardV2ChartsProps {
  summary: DashboardMetrics;
  classItems: ClassBreakdownItem[];
  territoryChildren: OperationsDashboardChild[];
  labels: OperationsV2ChartLabels;
  reportingMonthActive: boolean;
  honorsUnavailable: boolean;
}

function V2Tile({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card size="sm" className={cn("h-auto gap-3 py-4", className)}>
      <CardHeader className="gap-1">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function V2Gauge({
  value,
  label,
  color,
}: {
  value: number | null;
  label: string;
  color: string;
}) {
  const formatNumber = useFormatNumber();

  if (value === null) {
    return (
      <div className="flex h-[88px] flex-col items-center justify-center" role="img" aria-label={label}>
        <span className="font-semibold text-xl text-muted-foreground">—</span>
        <span className="mt-0.5 text-center text-[10px] text-muted-foreground">{label}</span>
      </div>
    );
  }

  const clamped = Math.min(100, Math.max(0, value));
  const data = [{ value: clamped, fill: color }];

  return (
    <div className="relative h-[88px]" role="img" aria-label={`${label}: ${clamped}%`}>
      <ChartContainer config={{ value: { label, color } }} className="h-full w-full">
        <RadialBarChart data={data} startAngle={215} endAngle={-35} innerRadius="68%" outerRadius="96%" cx="50%" cy="55%">
          <RadialBar
            dataKey="value"
            cornerRadius={5}
            background={{ fill: "hsl(var(--muted) / 0.4)" }}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
        <p className="font-bold text-lg tabular-nums" style={{ color }}>
          {formatNumber(clamped)}%
        </p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function V2ColorBars({
  items,
  className,
  height = 72,
}: {
  items: Array<{ key: string; label: string; value: number; color: string }>;
  className?: string;
  height?: number;
}) {
  const config: ChartConfig = Object.fromEntries(
    items.map((item) => [item.key, { label: item.label, color: item.color }]),
  );

  return (
    <ChartContainer config={config} className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            interval={0}
          />
          <YAxis hide domain={[0, "dataMax"]} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {items.map((item) => (
              <Cell key={item.key} fill={item.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

function V2MiniDonut({
  segments,
  size = 72,
}: {
  segments: Array<{ key: string; label: string; value: number; color: string }>;
  size?: number;
}) {
  const data = segments.filter((s) => s.value > 0);
  const config: ChartConfig = Object.fromEntries(
    segments.map((s) => [s.key, { label: s.label, color: s.color }]),
  );

  if (data.length === 0) {
    return <div className="flex h-[72px] items-center justify-center text-muted-foreground text-xs">—</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <ChartContainer config={config} className="shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="58%" outerRadius="88%" strokeWidth={0} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={segments.find((s) => s.key === entry.key)?.color ?? C.c1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
      <ul className="min-w-0 flex-1 space-y-0.5 text-[10px] text-muted-foreground">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5 truncate">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden />
            <span className="truncate">{segment.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function V2QueueBars({
  items,
  ariaLabel,
}: {
  items: Array<{ key: string; label: string; value: number | null; color: string }>;
  ariaLabel: string;
}) {
  const formatNumber = useFormatNumber();
  const data = items.map((item) => ({ ...item, value: item.value ?? 0 }));
  const max = Math.max(...data.map((d) => d.value), 1);
  const config: ChartConfig = Object.fromEntries(
    data.map((item) => [item.key, { label: item.label, color: item.color }]),
  );

  return (
    <ChartContainer config={config} className="h-[140px] w-full" aria-label={ariaLabel}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
        <YAxis type="category" dataKey="label" width={96} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
        <XAxis type="number" hide domain={[0, max]} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatNumber(Number(v))} />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false}>
          {data.map((item) => (
            <Cell key={item.key} fill={item.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function V2TerritoryChart({
  children,
  labels,
}: {
  children: OperationsDashboardChild[];
  labels: OperationsV2ChartLabels;
}) {
  const formatNumber = useFormatNumber();

  const data = useMemo(
    () =>
      [...children]
        .sort((a, b) => b.operations.operational_clubs - a.operations.operational_clubs)
        .slice(0, 8)
        .map((child) => ({
          key: `${child.level}-${child.id}`,
          name: child.name.length > 14 ? `${child.name.slice(0, 12)}…` : child.name,
          operational: child.operations.operational_clubs,
          missing: child.monthly_reports.missing_sections,
          people: child.people.institutionally_active,
        })),
    [children],
  );

  const config: ChartConfig = {
    operational: { label: labels.territoryOperational, color: C.c1 },
    missing: { label: labels.territoryMissing, color: C.danger },
    people: { label: labels.territoryPeople, color: C.c3 },
  };

  if (data.length === 0) return null;

  return (
    <ChartContainer config={config} className="h-[200px] w-full" aria-label={labels.territoryTitle}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="18%">
        <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="hsl(var(--border) / 0.6)" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} interval={0} height={40} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} tick={{ fontSize: 9 }} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatNumber(Number(v))} />} />
        <Bar dataKey="operational" fill="var(--color-operational)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="missing" fill="var(--color-missing)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="people" fill="var(--color-people)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function OperationsDashboardV2Charts({
  summary,
  classItems,
  territoryChildren,
  labels,
  reportingMonthActive,
  honorsUnavailable,
}: OperationsDashboardV2ChartsProps) {
  const formatNumber = useFormatNumber();

  const reportBars = [
    { key: "submitted", label: labels.submitted, value: summary.monthly_reports.submitted_sections, color: C.c2 },
    { key: "draft", label: labels.draft, value: summary.monthly_reports.draft_sections, color: C.c4 },
    { key: "generated", label: labels.generated, value: summary.monthly_reports.generated_sections, color: C.c3 },
    { key: "missing", label: labels.missing, value: summary.monthly_reports.missing_sections, color: C.danger },
    { key: "expected", label: labels.expected, value: summary.monthly_reports.expected_sections, color: C.muted },
  ];

  const activityBars = [
    { key: "registered", label: labels.registered, value: summary.activities.registered, color: C.c1 },
    { key: "joint", label: labels.joint, value: summary.activities.joint_registered, color: C.c3 },
    { key: "sections", label: labels.sections, value: summary.activities.distinct_participating_sections, color: C.c5 },
  ];

  const queueItems = [
    { key: "roles", label: labels.queueRoles, value: summary.queues.role_assignments_pending, color: C.c1 },
    { key: "transfers", label: labels.queueTransfers, value: summary.queues.transfers_pending, color: C.c2 },
    { key: "classes", label: labels.queueClasses, value: summary.queues.class_validations_pending, color: C.c3 },
    { key: "honors", label: labels.queueHonors, value: summary.queues.honors_review_pending, color: C.c4 },
    { key: "folders", label: labels.queueFolders, value: summary.queues.annual_folders_pending_union, color: C.c5 },
  ];

  const honorsSegments = honorsUnavailable
    ? []
    : [
        { key: "progress", label: labels.honorsInProgress, value: summary.honors.in_progress ?? 0, color: C.c1 },
        { key: "review", label: labels.honorsPending, value: summary.honors.pending_review ?? 0, color: C.c4 },
        { key: "approved", label: labels.honorsApproved, value: summary.honors.approved ?? 0, color: C.c2 },
      ];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <V2Tile title={labels.operationTitle} description={labels.operationDescription}>
        <V2Gauge value={summary.operations.operational_rate_pct} label={labels.operationalRate} color={C.c1} />
        <BentoSplitBar
          className="mt-2"
          segments={[
            { key: "operational", label: labels.operationalClubs, value: summary.operations.operational_clubs, color: C.c1 },
            { key: "nonOperational", label: labels.nonOperationalClubs, value: summary.operations.non_operational_clubs, color: C.muted },
          ]}
        />
        <BentoSplitBar
          className="mt-2"
          segments={[
            { key: "active", label: labels.adminActive, value: summary.administrative_clubs.active, color: C.c2 },
            { key: "inactive", label: labels.adminInactive, value: summary.administrative_clubs.inactive, color: C.muted },
          ]}
        />
      </V2Tile>

      <V2Tile
        title={labels.complianceTitle}
        description={reportingMonthActive ? labels.complianceDescription : labels.complianceNotApplicable}
      >
        <V2Gauge
          value={reportingMonthActive ? summary.monthly_reports.coverage_pct : null}
          label={labels.coverage}
          color={C.c2}
        />
        {reportingMonthActive ? (
          <V2ColorBars items={reportBars.slice(0, 4)} height={72} className="mt-2" />
        ) : null}
      </V2Tile>

      <V2Tile title={labels.peopleTitle} description={labels.peopleDescription}>
        <p className="mb-2 font-semibold text-2xl text-primary tabular-nums tracking-tight">
          {formatNumber(summary.people.institutionally_active)}
        </p>
        <V2MiniDonut
          segments={[
            { key: "active", label: labels.platformActive, value: summary.people.platform_accounts.active, color: C.c2 },
            { key: "inactive", label: labels.platformInactive, value: summary.people.platform_accounts.inactive, color: C.c4 },
          ]}
        />
      </V2Tile>

      <V2Tile title={labels.honorsTitle} description={labels.honorsDescription}>
        {honorsUnavailable ? (
          <p className="text-muted-foreground text-sm">{labels.honorsUnavailable}</p>
        ) : (
          <V2MiniDonut segments={honorsSegments} />
        )}
      </V2Tile>

      <V2Tile title={labels.queuesTitle} description={labels.queuesDescription}>
        <V2QueueBars items={queueItems} ariaLabel={labels.queuesTitle} />
      </V2Tile>

      <V2Tile title={labels.activitiesTitle} description={labels.activitiesDescription}>
        <V2ColorBars items={activityBars} height={96} />
      </V2Tile>

      <V2Tile
        className="lg:col-span-2"
        title={labels.formationTitle}
        description={labels.formationDescription}
      >
        {classItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">{labels.formationEmpty}</p>
        ) : (
          <ClassEnrollmentsChart items={classItems} showTable={false} compact />
        )}
      </V2Tile>

      {territoryChildren.length > 0 ? (
        <V2Tile
          className="lg:col-span-2"
          title={labels.territoryTitle}
          description={labels.territoryDescription}
        >
          <V2TerritoryChart children={territoryChildren} labels={labels} />
          <div className="mt-2 flex flex-wrap gap-3 text-muted-foreground text-xs">
            <span>
              <span className="mr-1 inline-block size-2 rounded-sm bg-[hsl(var(--chart-1))]" />
              {labels.territoryOperational}
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-sm bg-destructive" />
              {labels.territoryMissing}
            </span>
            <span>
              <span className="mr-1 inline-block size-2 rounded-sm bg-[hsl(var(--chart-3))]" />
              {labels.territoryPeople}
            </span>
          </div>
        </V2Tile>
      ) : null}
    </div>
  );
}
