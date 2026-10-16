import type { AuthUser } from "@/lib/auth/types";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import type {
  ClassBreakdownItem,
  DashboardMetrics,
  OperationsDashboardChild,
  OperationsDashboardQuery,
  OperationsDashboardScope,
} from "@/lib/api/operations-dashboard";

export type OperationsQueueId =
  | "roles"
  | "transfers"
  | "classes"
  | "honors"
  | "folders";

export const OPERATIONS_QUEUE_HREFS: Record<OperationsQueueId, string> = {
  roles: "/dashboard/requests/assignments",
  transfers: "/dashboard/requests/transfers",
  classes: "/dashboard/clubs/validations?tab=sections",
  honors: "/dashboard/clubs/validations?tab=honors",
  folders: "/dashboard/annual-folders/evaluate",
};

export type OperationsWorkItem = {
  id: OperationsQueueId;
  count: number;
  href: string;
};

export function hrefPath(href: string): string {
  return href.split("?")[0] ?? href;
}

export function firstAccessibleHref(
  user: AuthUser,
  hrefs: readonly string[],
): string | undefined {
  return hrefs.find((href) => canAccessDashboardPath(user, hrefPath(href)));
}

export function buildWorkQueue(summary: DashboardMetrics): OperationsWorkItem[] {
  const rows: Array<{ id: OperationsQueueId; count: number | null; href: string }> = [
    {
      id: "roles",
      count: summary.queues.role_assignments_pending,
      href: OPERATIONS_QUEUE_HREFS.roles,
    },
    {
      id: "transfers",
      count: summary.queues.transfers_pending,
      href: OPERATIONS_QUEUE_HREFS.transfers,
    },
    {
      id: "classes",
      count: summary.queues.class_validations_pending,
      href: OPERATIONS_QUEUE_HREFS.classes,
    },
    {
      id: "honors",
      count: summary.queues.honors_review_pending,
      href: OPERATIONS_QUEUE_HREFS.honors,
    },
    {
      id: "folders",
      count: summary.queues.annual_folders_pending_union,
      href: OPERATIONS_QUEUE_HREFS.folders,
    },
  ];

  return rows
    .filter((row): row is OperationsWorkItem => row.count != null && row.count > 0)
    .sort((a, b) => b.count - a.count);
}

export type HomeMode = "supervise" | "dispatch";

/**
 * Dispatch (work queue first) only for the actor's own local field or
 * coordinator scope. Wider levels and any drill-down supervise.
 */
export function resolveHomeMode(
  scope: OperationsDashboardScope,
  query: OperationsDashboardQuery,
): HomeMode {
  const drilledDown =
    query.division_id !== undefined ||
    query.union_id !== undefined ||
    query.local_field_id !== undefined;
  const dispatchLevel = scope.level === "local_field" || scope.level === "coordinator";
  return dispatchLevel && !drilledDown ? "dispatch" : "supervise";
}

export type ChildGap = {
  missingSections: number;
  nonOperationalClubs: number;
  pendingTotal: number;
  hasGap: boolean;
};

function pendingTotal(queues: DashboardMetrics["queues"]): number {
  return (
    queues.role_assignments_pending +
    queues.transfers_pending +
    queues.class_validations_pending +
    (queues.honors_review_pending ?? 0) +
    queues.annual_folders_pending_union
  );
}

export function childGap(
  child: OperationsDashboardChild,
  hasReportingMonth: boolean,
): ChildGap {
  const missingSections = hasReportingMonth ? child.monthly_reports.missing_sections : 0;
  const nonOperationalClubs = child.operations.non_operational_clubs;
  return {
    missingSections,
    nonOperationalClubs,
    pendingTotal: pendingTotal(child.queues),
    hasGap: missingSections > 0 || nonOperationalClubs > 0,
  };
}

export type RankedChild = { child: OperationsDashboardChild; gap: ChildGap };

export function rankChildrenByGap(
  children: OperationsDashboardChild[],
  hasReportingMonth: boolean,
): RankedChild[] {
  return children
    .map((child) => ({ child, gap: childGap(child, hasReportingMonth) }))
    .sort(
      (a, b) =>
        Number(b.gap.hasGap) - Number(a.gap.hasGap) ||
        b.gap.missingSections - a.gap.missingSections ||
        b.gap.nonOperationalClubs - a.gap.nonOperationalClubs ||
        b.gap.pendingTotal - a.gap.pendingTotal ||
        a.child.name.localeCompare(b.child.name, "es"),
    );
}

/** Pending queues with work AND a screen the user can open. */
export function visibleWorkQueue(
  summary: DashboardMetrics,
  user: AuthUser,
): OperationsWorkItem[] {
  return buildWorkQueue(summary).filter((item) => firstAccessibleHref(user, [item.href]));
}

export function attentionTotal(items: OperationsWorkItem[]): number {
  return items.reduce((total, item) => total + item.count, 0);
}

export type HomeSection = "breakdown" | "attention";

/** Dispatch leads with the work queue; supervision leads with the territorial breakdown. */
export function homeSectionOrder(mode: HomeMode): [HomeSection, HomeSection] {
  return mode === "dispatch" ? ["attention", "breakdown"] : ["breakdown", "attention"];
}

export type ProgressTone = "destructive" | "warning" | "success" | "none";

/** <50% destructive, 50–79% warning, ≥80% success; no value → no fill. */
export function progressTone(pct: number | null | undefined): ProgressTone {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return "none";
  if (pct < 50) return "destructive";
  if (pct < 80) return "warning";
  return "success";
}

const CHART_FALLBACK_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Section token by club type name; unknown types fall back to the chart palette. */
export function clubTypeColor(clubTypeName: string, fallbackIndex: number): string {
  const name = normalizeName(clubTypeName);
  if (name.includes("aventurer")) return "var(--section-aventureros)";
  if (name.includes("conquistador")) return "var(--section-conquistadores)";
  if (name.includes("guia")) return "var(--section-guias)";
  return CHART_FALLBACK_COLORS[fallbackIndex % CHART_FALLBACK_COLORS.length];
}

export type ClassTypeGroup = {
  id: number;
  name: string;
  color: string;
  total: number;
  items: ClassBreakdownItem[];
};

/** Classes with enrollments, in display order, grouped by club type (first-seen order). */
export function groupClassesByClubType(items: ClassBreakdownItem[]): ClassTypeGroup[] {
  const sorted = items
    .filter((item) => item.enrollment_count > 0)
    .sort((a, b) => a.display_order - b.display_order || a.class_id - b.class_id);
  const groups: ClassTypeGroup[] = [];
  const indexByType = new Map<number, ClassTypeGroup>();
  let unknownTypes = 0;

  for (const item of sorted) {
    let group = indexByType.get(item.club_type_id);
    if (!group) {
      const known = /aventurer|conquistador|guia/.test(normalizeName(item.club_type_name));
      group = {
        id: item.club_type_id,
        name: item.club_type_name,
        color: clubTypeColor(item.club_type_name, known ? 0 : unknownTypes++),
        total: 0,
        items: [],
      };
      indexByType.set(item.club_type_id, group);
      groups.push(group);
    }
    group.items.push(item);
    group.total += item.enrollment_count;
  }

  return groups;
}
