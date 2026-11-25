/**
 * Grouping of the Configuración rail (lista lateral). Pure: the server wrapper
 * supplies the permission predicate and the localised labels, so the grouping,
 * the filter by permission and the "first visible item" rule are testable.
 *
 * Several items live outside `/dashboard/configuration` (scoring categories,
 * role requirements, evidence templates); each of those routes wraps itself in
 * the same frame so the rail follows the user across them.
 */

export type ConfigurationRailGroupId = "local_field" | "investiture" | "evaluation" | "system";

export type ConfigurationRailItemId =
  | "paymentMethods"
  | "delivery"
  | "investitureWindow"
  | "districtPastors"
  | "evidenceTemplates"
  | "scoringCategories"
  | "roleRequirements"
  | "achievements"
  | "variables";

export interface ConfigurationRailEntry {
  id: ConfigurationRailItemId;
  /** Real route of the screen (also what the permission gate resolves). */
  url: string;
  /** Section anchor inside the same screen; not part of the gate. */
  hash?: string;
}

export interface ConfigurationRailGroupDef {
  id: ConfigurationRailGroupId;
  entries: readonly ConfigurationRailEntry[];
}

export const INVESTITURE_SETTINGS_URL = "/dashboard/configuration/investiture";

export const CONFIGURATION_RAIL_GROUPS: readonly ConfigurationRailGroupDef[] = [
  {
    id: "local_field",
    entries: [
      { id: "paymentMethods", url: "/dashboard/configuration/local-field/payment-methods" },
      { id: "delivery", url: "/dashboard/configuration/local-field/delivery" },
    ],
  },
  {
    id: "investiture",
    entries: [
      { id: "investitureWindow", url: INVESTITURE_SETTINGS_URL },
      // Same screen as the window: districts and pastors are its second section.
      { id: "districtPastors", url: INVESTITURE_SETTINGS_URL, hash: "pastors" },
      { id: "evidenceTemplates", url: "/dashboard/clubs/evidence-folders/templates" },
    ],
  },
  {
    id: "evaluation",
    entries: [
      { id: "scoringCategories", url: "/dashboard/settings/scoring-categories" },
      { id: "roleRequirements", url: "/dashboard/role-requirements" },
      { id: "achievements", url: "/dashboard/configuration/achievements" },
    ],
  },
  {
    id: "system",
    entries: [{ id: "variables", url: "/dashboard/configuration/variables" }],
  },
];

export interface ConfigurationRailItem {
  href: string;
  label: string;
}

export interface ConfigurationRailGroup {
  label: string;
  items: ConfigurationRailItem[];
}

export interface BuildConfigurationRailOptions {
  /** True when the user may open that screen (same predicate as the page gate). */
  canOpen: (entry: ConfigurationRailEntry) => boolean;
  itemLabel: (id: ConfigurationRailItemId) => string;
  groupLabel: (id: ConfigurationRailGroupId) => string;
  groups?: readonly ConfigurationRailGroupDef[];
}

/** Rail groups limited to what the user can open; empty groups are dropped. */
export function buildConfigurationRailGroups({
  canOpen,
  itemLabel,
  groupLabel,
  groups = CONFIGURATION_RAIL_GROUPS,
}: BuildConfigurationRailOptions): ConfigurationRailGroup[] {
  const result: ConfigurationRailGroup[] = [];
  for (const group of groups) {
    const items: ConfigurationRailItem[] = [];
    for (const entry of group.entries) {
      if (!canOpen(entry)) continue;
      items.push({
        href: entry.hash ? `${entry.url}#${entry.hash}` : entry.url,
        label: itemLabel(entry.id),
      });
    }
    if (items.length > 0) result.push({ label: groupLabel(group.id), items });
  }
  return result;
}

/** Destination of the index route: the first screen the user can open. */
export function firstVisibleConfigurationHref(
  groups: readonly ConfigurationRailGroup[],
): string | null {
  return groups[0]?.items[0]?.href ?? null;
}
