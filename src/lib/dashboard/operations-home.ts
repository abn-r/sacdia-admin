import type { AuthUser } from "@/lib/auth/types";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import type {
  ChildLevel,
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

export type LagReason = "missingReport" | "nonOperational";

export function laggingClubs(
  children: OperationsDashboardChild[],
  hasReportingMonth: boolean,
): Array<{ child: OperationsDashboardChild; reasons: LagReason[] }> {
  return rankChildrenByGap(children, hasReportingMonth)
    .filter(({ gap }) => gap.hasGap)
    .map(({ child, gap }) => {
      const reasons: LagReason[] = [];
      if (gap.missingSections > 0) reasons.push("missingReport");
      if (gap.nonOperationalClubs > 0) reasons.push("nonOperational");
      return { child, reasons };
    });
}

export type SummaryMessage =
  | { key: "childrenReported"; values: { reported: number; total: number; level: ChildLevel } }
  | { key: "sectionsReported"; values: { submitted: number; expected: number } }
  | { key: "noClosedMonth"; values: Record<string, never> }
  | { key: "nonOperationalClubs"; values: { count: number } };

function nonOperationalMessage(summary: DashboardMetrics): SummaryMessage[] {
  const count = summary.operations.non_operational_clubs;
  return count > 0 ? [{ key: "nonOperationalClubs", values: { count } }] : [];
}

export function supervisionSummary(
  children: OperationsDashboardChild[],
  childLevel: ChildLevel,
  summary: DashboardMetrics,
  hasReportingMonth: boolean,
): SummaryMessage[] {
  if (!hasReportingMonth) {
    return [{ key: "noClosedMonth", values: {} }, ...nonOperationalMessage(summary)];
  }
  const expecting = children.filter((child) => child.monthly_reports.expected_sections > 0);
  // `missing_sections` excludes generated drafts, so it cannot tell "delivered".
  const reported = expecting.filter(
    (child) => child.monthly_reports.submitted_sections >= child.monthly_reports.expected_sections,
  );
  const reportMessage: SummaryMessage[] =
    expecting.length > 0
      ? [
          {
            key: "childrenReported",
            values: { reported: reported.length, total: expecting.length, level: childLevel },
          },
        ]
      : [];
  return [...reportMessage, ...nonOperationalMessage(summary)];
}

export function dispatchSummary(
  summary: DashboardMetrics,
  hasReportingMonth: boolean,
): SummaryMessage[] {
  if (!hasReportingMonth) {
    return [{ key: "noClosedMonth", values: {} }, ...nonOperationalMessage(summary)];
  }
  const { expected_sections: expected, submitted_sections: submitted } = summary.monthly_reports;
  const reportMessage: SummaryMessage[] =
    expected > 0 ? [{ key: "sectionsReported", values: { submitted, expected } }] : [];
  return [...reportMessage, ...nonOperationalMessage(summary)];
}

/** Pending queues with work AND a screen the user can open. */
export function visibleWorkQueue(
  summary: DashboardMetrics,
  user: AuthUser,
): OperationsWorkItem[] {
  return buildWorkQueue(summary).filter((item) => firstAccessibleHref(user, [item.href]));
}
