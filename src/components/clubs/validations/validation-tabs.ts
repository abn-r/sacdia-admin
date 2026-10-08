export type ClubsValidationTab = "honors" | "sections" | "certificates";

export const CLUBS_VALIDATION_TABS: ClubsValidationTab[] = [
  "honors",
  "sections",
  "certificates",
];

/** `modules` fue la cola de clase de la vía anterior (fase 8). */
const LEGACY_TAB_ALIASES: Record<string, ClubsValidationTab> = {
  modules: "sections",
};

export function resolveClubsValidationTab(raw: string | undefined): ClubsValidationTab {
  if (!raw) return "honors";
  if (LEGACY_TAB_ALIASES[raw]) return LEGACY_TAB_ALIASES[raw];
  return CLUBS_VALIDATION_TABS.includes(raw as ClubsValidationTab)
    ? (raw as ClubsValidationTab)
    : "honors";
}
