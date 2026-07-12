import type { ClubMainTabId, ClubSubPanelId } from "./tabs-nav";

export type { ClubMainTabId, ClubSubPanelId };
export type ClubTabId = ClubMainTabId | ClubSubPanelId | "edit";

const MAIN_TAB_KEYS: ClubMainTabId[] = [
  "overview",
  "sections",
  "responsables",
  "units",
  "membership",
  "history",
  "info",
];

export type ResolvedClubDetailRoute = {
  tab: ClubMainTabId;
  openEdit: boolean;
};

export function resolveClubDetailRoute(
  raw: string | undefined,
): ResolvedClubDetailRoute {
  if (raw === "edit") {
    return { tab: "overview", openEdit: true };
  }
  if (raw && (MAIN_TAB_KEYS as string[]).includes(raw)) {
    return { tab: raw as ClubMainTabId, openEdit: false };
  }
  if (raw === "view") {
    return { tab: "overview", openEdit: false };
  }
  return { tab: "overview", openEdit: false };
}

/** @deprecated Use resolveClubDetailRoute */
export function resolveTabFromString(raw: string | undefined): ClubMainTabId {
  return resolveClubDetailRoute(raw).tab;
}
