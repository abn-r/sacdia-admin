import type {
  AnnualFolderEvaluationQueueItem,
  AnnualFolderEvaluationQueueStatus,
} from "@/lib/api/annual-folders";

/**
 * Pure helpers of the evidence-folder queue (pestañas Por evaluar / Por
 * confirmar en unión / Evaluadas). Server pages may import this module: it has
 * no "use client".
 */

export const QUEUE_TABS = ["evaluate", "union", "evaluated"] as const;
export type QueueTab = (typeof QUEUE_TABS)[number];
export const DEFAULT_QUEUE_TAB: QueueTab = "evaluate";

export const QUEUE_PAGE_SIZES = [20, 50, 100] as const;
/** The API caps `limit` at 100 per page. */
export const QUEUE_MAX_LIMIT = 100;

export const ALL_FILTER = "all";

export function parseQueueTab(raw: string | null | undefined): QueueTab {
  return (QUEUE_TABS as readonly string[]).includes(raw ?? "")
    ? (raw as QueueTab)
    : DEFAULT_QUEUE_TAB;
}

/** Queue status the API understands for each tab. */
export const TAB_STATUS: Record<QueueTab, AnnualFolderEvaluationQueueStatus> = {
  evaluate: "submitted",
  union: "preapproved",
  evaluated: "evaluated",
};

export type QueueFilters = {
  search: string;
  clubTypeId: string;
  yearId: string;
  unionId: string;
  localFieldId: string;
};

export const EMPTY_QUEUE_FILTERS: QueueFilters = {
  search: "",
  clubTypeId: ALL_FILTER,
  yearId: ALL_FILTER,
  unionId: ALL_FILTER,
  localFieldId: ALL_FILTER,
};

export function hasActiveQueueFilters(filters: QueueFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.clubTypeId !== ALL_FILTER ||
    filters.yearId !== ALL_FILTER ||
    filters.unionId !== ALL_FILTER ||
    filters.localFieldId !== ALL_FILTER
  );
}

function numericOrUndefined(value: string): number | undefined {
  if (value === ALL_FILTER) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildQueueParams(
  tab: QueueTab,
  filters: QueueFilters,
  page: number,
  limit: number,
) {
  const search = filters.search.trim();
  return {
    status: TAB_STATUS[tab],
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), QUEUE_MAX_LIMIT),
    ...(search ? { search } : {}),
    ...(numericOrUndefined(filters.clubTypeId) !== undefined
      ? { club_type_id: numericOrUndefined(filters.clubTypeId) }
      : {}),
    ...(numericOrUndefined(filters.yearId) !== undefined
      ? { year_id: numericOrUndefined(filters.yearId) }
      : {}),
    ...(numericOrUndefined(filters.unionId) !== undefined
      ? { union_id: numericOrUndefined(filters.unionId) }
      : {}),
    ...(numericOrUndefined(filters.localFieldId) !== undefined
      ? { local_field_id: numericOrUndefined(filters.localFieldId) }
      : {}),
  };
}

/** Sections of one folder that fall in the tab, out of all its sections. */
export function tabSectionCounts(
  item: AnnualFolderEvaluationQueueItem,
  tab: QueueTab,
): { count: number; total: number; rejected: number } {
  const total = item.total_sections;
  switch (tab) {
    case "evaluate":
      return { count: item.submitted_sections_count, total, rejected: 0 };
    case "union":
      return { count: item.preapproved_sections_count, total, rejected: 0 };
    case "evaluated":
      return {
        count: item.validated_sections_count,
        total,
        rejected: item.rejected_sections_count,
      };
  }
}

export function queueTotalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, limit)));
}

/** The queue tab a folder link should open on (deep link `?focus=union`). */
export function folderPathWithFocus(basePath: string, tab: QueueTab): string {
  return tab === "union" ? `${basePath}?focus=union` : basePath;
}
