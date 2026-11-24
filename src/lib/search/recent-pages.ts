export const RECENT_PAGES_KEY = "sacdia_admin_recent";
export const RECENT_PAGES_LIMIT = 5;

export type RecentPage = { href: string; label: string };

function isRecentPage(value: unknown): value is RecentPage {
  if (!value || typeof value !== "object") return false;
  const { href, label } = value as Record<string, unknown>;
  return typeof href === "string" && typeof label === "string" && href.length > 0;
}

export function readRecentPages(): RecentPage[] {
  try {
    const raw = window.localStorage.getItem(RECENT_PAGES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentPage).slice(0, RECENT_PAGES_LIMIT);
  } catch {
    return [];
  }
}

/** Most recent first, deduplicated by href, capped at RECENT_PAGES_LIMIT. */
export function pushRecentPage(entry: RecentPage): RecentPage[] {
  const next = [entry, ...readRecentPages().filter((item) => item.href !== entry.href)].slice(
    0,
    RECENT_PAGES_LIMIT,
  );
  try {
    window.localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(next));
  } catch {
    // Storage can be full or blocked; recents are a convenience.
  }
  return next;
}
