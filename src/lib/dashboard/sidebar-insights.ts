import { fetchOperationsDashboard } from "@/lib/api/operations-dashboard";
import type { DashboardMetrics } from "@/lib/api/operations-dashboard";

/** Pending work per sidebar item id. Only action queues appear here. */
export type SidebarQueueCounts = Readonly<Record<string, number>>;

export type SidebarInsights = {
  /** Name of the actor's territorial scope (association, union, division...). */
  scopeName: string | null;
  counts: SidebarQueueCounts;
};

export const EMPTY_SIDEBAR_INSIGHTS: SidebarInsights = { scopeName: null, counts: {} };

/**
 * Maps the operations-dashboard queues onto sidebar item ids. Class validations
 * and honor reviews share the validations screen, so they add up there.
 */
export function sidebarCountsFromQueues(queues: DashboardMetrics["queues"]): SidebarQueueCounts {
  const raw: Record<string, number> = {
    "requests-assignments": queues.role_assignments_pending,
    "requests-transfers": queues.transfers_pending,
    "validations-investitures":
      queues.class_validations_pending + (queues.honors_review_pending ?? 0),
    "annual-folders-evaluate": queues.annual_folders_pending_union,
  };
  const counts: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (Number.isFinite(value) && value > 0) counts[id] = value;
  }
  return counts;
}

/**
 * Server-only. Never throws: the sidebar is decoration and must not break the
 * layout. The backend caches this endpoint for 60s; the layout does not await
 * the returned promise, so page render is not blocked.
 */
export async function loadSidebarInsights(): Promise<SidebarInsights> {
  try {
    const data = await fetchOperationsDashboard({});
    return {
      scopeName: data.meta.scope.name?.trim() || null,
      counts: sidebarCountsFromQueues(data.summary.queues),
    };
  } catch {
    return EMPTY_SIDEBAR_INSIGHTS;
  }
}
