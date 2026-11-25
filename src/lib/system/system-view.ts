/**
 * URL contract of the Sistema screen: one entry, tab in `?tab=`, history
 * filters in the same query. Pure helpers so server page, client tabs and the
 * legacy `/history` redirect agree.
 */

export const SYSTEM_TABS = ["queues", "cron", "history"] as const;
export type SystemTab = (typeof SYSTEM_TABS)[number];
export const DEFAULT_SYSTEM_TAB: SystemTab = "queues";

export const CRON_HISTORY_STATUSES = ["completed", "failed", "skipped", "running"] as const;
export type CronHistoryStatus = (typeof CRON_HISTORY_STATUSES)[number];

export const SYSTEM_JOBS_PATH = "/dashboard/system/jobs";

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseSystemTab(value: string | string[] | undefined): SystemTab {
  const v = first(value);
  return (SYSTEM_TABS as readonly string[]).includes(v ?? "") ? (v as SystemTab) : DEFAULT_SYSTEM_TAB;
}

export type CronHistoryFilters = {
  job_name?: string;
  status?: CronHistoryStatus;
  since?: string;
  until?: string;
  page: number;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseCronHistoryFilters(params: RawParams): CronHistoryFilters {
  const jobName = first(params.job_name);
  const status = first(params.status);
  const since = first(params.since);
  const until = first(params.until);
  const pageNumber = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    ...(jobName && jobName !== "all" ? { job_name: jobName } : {}),
    ...(status && (CRON_HISTORY_STATUSES as readonly string[]).includes(status)
      ? { status: status as CronHistoryStatus }
      : {}),
    ...(since && DATE_ONLY.test(since) ? { since } : {}),
    ...(until && DATE_ONLY.test(until) ? { until } : {}),
    page: Number.isFinite(pageNumber) && pageNumber >= 1 ? pageNumber : 1,
  };
}

export function buildSystemHref(tab: SystemTab, filters?: Partial<CronHistoryFilters>): string {
  const qs = new URLSearchParams();
  if (tab !== DEFAULT_SYSTEM_TAB) qs.set("tab", tab);
  if (tab === "history" && filters) {
    if (filters.job_name) qs.set("job_name", filters.job_name);
    if (filters.status) qs.set("status", filters.status);
    if (filters.since) qs.set("since", filters.since);
    if (filters.until) qs.set("until", filters.until);
    if (filters.page && filters.page > 1) qs.set("page", String(filters.page));
  }
  const s = qs.toString();
  return s ? `${SYSTEM_JOBS_PATH}?${s}` : SYSTEM_JOBS_PATH;
}

/** Target of the old `/dashboard/system/jobs/history?...` links. */
export function legacyHistoryHref(params: RawParams): string {
  return buildSystemHref("history", parseCronHistoryFilters(params));
}
