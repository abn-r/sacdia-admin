/** The three report kinds share one entry (`/dashboard/reports`) and pick the kind with `?tab=`. */
export const REPORT_TABS = ["monthly", "quarterly", "annual"] as const;
export type ReportsTab = (typeof REPORT_TABS)[number];

export const REPORTS_PATH = "/dashboard/reports";

type Query = Record<string, string | string[] | undefined>;

export function parseReportsTab(raw: string | string[] | undefined): ReportsTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return REPORT_TABS.find((tab) => tab === value) ?? "monthly";
}

/**
 * `/dashboard/reports?tab=…&…`. The monthly tab is the default, so it carries
 * no `tab`. Empty values are dropped; arrays keep their first value.
 */
export function reportsTabHref(tab: ReportsTab, params: Query = {}): string {
  const query = new URLSearchParams();
  if (tab !== "monthly") query.set("tab", tab);
  for (const [key, raw] of Object.entries(params)) {
    if (key === "tab") continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${REPORTS_PATH}?${qs}` : REPORTS_PATH;
}
