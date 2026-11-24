export const CLUB_DETAIL_TABS = [
  "general",
  "sections",
  "members",
  "reports",
  "history",
] as const;

export type ClubDetailTabKey = (typeof CLUB_DETAIL_TABS)[number];

/** Old links (`?tab=roles`) land on the sections tab, where positions now live. */
export function resolveClubDetailTab(value: string | undefined | null): ClubDetailTabKey {
  if (value === "roles") return "sections";
  if (value && (CLUB_DETAIL_TABS as readonly string[]).includes(value)) {
    return value as ClubDetailTabKey;
  }
  return "general";
}

/** Tabs the actor can see: coordinators have no periodic reports. */
export function visibleClubDetailTabs(canViewPeriodicReports: boolean): ClubDetailTabKey[] {
  return CLUB_DETAIL_TABS.filter((tab) => tab !== "reports" || canViewPeriodicReports);
}
