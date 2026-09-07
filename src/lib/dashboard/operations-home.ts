import type { AuthUser } from "@/lib/auth/types";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import type { DashboardMetrics } from "@/lib/api/operations-dashboard";

export type OperationsQueueId =
  | "roles"
  | "transfers"
  | "classes"
  | "honors"
  | "folders";

export type OperationsShortcutId =
  | "clubs"
  | "users"
  | "enrollments"
  | "assignments"
  | "validations"
  | "reports"
  | "folders"
  | "activities"
  | "camporees";

export const OPERATIONS_QUEUE_HREFS: Record<OperationsQueueId, string> = {
  roles: "/dashboard/requests/assignments",
  transfers: "/dashboard/requests/transfers",
  classes: "/dashboard/clubs/validations?tab=modules",
  honors: "/dashboard/clubs/validations?tab=honors",
  folders: "/dashboard/annual-folders/evaluate",
};

export const OPERATIONS_SHORTCUTS: Array<{
  id: OperationsShortcutId;
  hrefs: readonly string[];
}> = [
  { id: "clubs", hrefs: ["/dashboard/clubs"] },
  { id: "users", hrefs: ["/dashboard/users"] },
  { id: "enrollments", hrefs: ["/dashboard/enrollments"] },
  { id: "assignments", hrefs: ["/dashboard/requests/assignments"] },
  { id: "validations", hrefs: ["/dashboard/clubs/validations"] },
  {
    id: "reports",
    hrefs: ["/dashboard/reports/supervision", "/dashboard/reports"],
  },
  { id: "folders", hrefs: ["/dashboard/annual-folders/evaluate"] },
  { id: "activities", hrefs: ["/dashboard/clubs/activities"] },
  { id: "camporees", hrefs: ["/dashboard/campamentos"] },
];

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

export function resolveReportsHref(user: AuthUser): string | undefined {
  return firstAccessibleHref(user, [
    "/dashboard/reports/supervision",
    "/dashboard/reports",
  ]);
}

export function resolveAccessibleShortcuts(
  user: AuthUser,
): Array<{ id: OperationsShortcutId; href: string }> {
  const resolved: Array<{ id: OperationsShortcutId; href: string }> = [];

  for (const shortcut of OPERATIONS_SHORTCUTS) {
    const href = firstAccessibleHref(user, shortcut.hrefs);
    if (href) {
      resolved.push({ id: shortcut.id, href });
    }
  }

  return resolved;
}
