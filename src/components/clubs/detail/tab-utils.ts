import type { ClubDetailTab } from "@/lib/clubs/types";

const VALID_TABS = new Set<ClubDetailTab>([
  "general",
  "sections",
  "roles",
  "reports",
  "history",
]);

export function resolveClubDetailTab(value: string | undefined): ClubDetailTab {
  if (value && VALID_TABS.has(value as ClubDetailTab)) {
    return value as ClubDetailTab;
  }
  return "general";
}

export const CLUB_DETAIL_TABS: ClubDetailTab[] = [
  "general",
  "sections",
  "roles",
  "reports",
  "history",
];
