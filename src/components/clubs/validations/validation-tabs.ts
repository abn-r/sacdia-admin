/** Tabs of "Especialidades y clases", one per type of decision (`?tab=`). */
export type ClassesTab = "pending" | "evidence" | "instructors" | "history";

export const CLASSES_TABS: readonly ClassesTab[] = [
  "pending",
  "evidence",
  "instructors",
  "history",
];

export type EvidenceTypeFilter = "all" | "class" | "honor";

export const EVIDENCE_TYPE_FILTERS: readonly EvidenceTypeFilter[] = ["all", "class", "honor"];

/** Query values of the previous layout (honors / sections / modules tabs). */
const LEGACY_TAB_ALIASES: Record<string, ClassesTab> = {
  honors: "pending",
  sections: "evidence",
  modules: "evidence",
};

export function resolveEvidenceTypeFilter(raw: string | undefined): EvidenceTypeFilter {
  return EVIDENCE_TYPE_FILTERS.includes(raw as EvidenceTypeFilter)
    ? (raw as EvidenceTypeFilter)
    : "all";
}

/** `?tab=sections` used to mean "class evidence": keep that intent as a type filter. */
export function legacyEvidenceType(rawTab: string | undefined): EvidenceTypeFilter | null {
  return rawTab === "sections" || rawTab === "modules" ? "class" : null;
}

/**
 * Tab to show for a raw `?tab=` value. Legacy aliases map to their new tab;
 * a tab the user cannot see, or an unknown value, falls back to the first
 * available one.
 */
export function resolveClassesTab(
  raw: string | undefined,
  available: readonly ClassesTab[],
): ClassesTab {
  const first = available[0] ?? "pending";
  if (!raw) return first;
  const mapped = LEGACY_TAB_ALIASES[raw] ?? (CLASSES_TABS.includes(raw as ClassesTab) ? (raw as ClassesTab) : null);
  return mapped && available.includes(mapped) ? mapped : first;
}

export type ClassesAccess = { validations: boolean; proposals: boolean };

/** Tabs the user can see: validations unlock the first two, the proposals capability the last two. */
export function availableClassesTabs(access: ClassesAccess): ClassesTab[] {
  const tabs: ClassesTab[] = [];
  if (access.validations) tabs.push("pending", "evidence");
  if (access.proposals) tabs.push("instructors", "history");
  return tabs;
}
