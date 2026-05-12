import type { ClubTabId } from "./tabs-nav";

export type { ClubTabId };

const TAB_KEYS: ClubTabId[] = [
  "overview",
  "sections",
  "units",
  "membership",
  "info",
  "history",
  "edit",
];

export function resolveTabFromString(raw: string | undefined): ClubTabId {
  if (raw && (TAB_KEYS as string[]).includes(raw)) {
    return raw as ClubTabId;
  }
  if (raw === "view") return "overview";
  return "overview";
}
