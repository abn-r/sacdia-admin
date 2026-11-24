import type { ClubHistoryItem } from "@/lib/api/club-detail";

/**
 * Client-side section filter. The history endpoint takes no section filter
 * (only `limit` and `cursor`), so this only sees the pages already loaded and
 * only matches events whose entity is the section itself. Role and counselor
 * assignment events carry no section id, so they are not matched.
 */
export function filterHistoryItems(items: ClubHistoryItem[], sectionFilter: string): ClubHistoryItem[] {
  if (sectionFilter === "all") return items;
  return items.filter(
    (item) => item.entity_type === "club_section" && item.entity_id === sectionFilter,
  );
}

export function historyEventKey(item: ClubHistoryItem): string {
  return item.audit_log_id;
}
