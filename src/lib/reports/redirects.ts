import { reportsTabHref, type ReportsTab } from "./tabs";

type Query = Record<string, string | string[] | undefined>;

/**
 * Where an old report URL (`/reports/supervision`, `/reports/quarterly`,
 * `/reports/annual`) lands now: the matching tab of `/reports`, keeping every
 * filter that was in the URL.
 */
export function legacyReportsRedirect(tab: ReportsTab, searchParams: Query): string {
  return reportsTabHref(tab, searchParams);
}
