/**
 * Grouping of the catalogs rail (lista lateral). Pure: the layout supplies the
 * permission predicate and the localised labels, so the grouping, the filter by
 * permission and the "first visible catalog" rule are testable on their own.
 */

export const CATALOGS_BASE_PATH = "/dashboard/catalogs";

export type CatalogRailGroupId = "territory" | "clubs" | "honors" | "health" | "operation";

export interface CatalogRailEntry {
  /** Screen-catalog / sidebar id of the catalog (its gate decides visibility). */
  id: string;
  url: string;
}

export interface CatalogRailGroupDef {
  id: CatalogRailGroupId;
  entries: readonly CatalogRailEntry[];
}

const entry = (slug: string): CatalogRailEntry => ({
  id: `catalogs-${slug}`,
  url: `${CATALOGS_BASE_PATH}/${slug}`,
});

export const CATALOG_RAIL_GROUPS: readonly CatalogRailGroupDef[] = [
  {
    id: "territory",
    entries: ["divisions", "countries", "unions", "local-fields", "districts", "churches"].map(entry),
  },
  {
    id: "clubs",
    entries: [
      "club-types",
      "club-ideals",
      "classes",
      "class-modules",
      "class-sections",
      "certifications",
      "ecclesiastical-years",
      "activity-types",
    ].map(entry),
  },
  {
    id: "honors",
    entries: ["honor-categories", "honors", "master-honors"].map(entry),
  },
  {
    id: "health",
    entries: ["allergies", "diseases", "medicines", "relationship-types"].map(entry),
  },
  {
    id: "operation",
    entries: ["finance-categories", "inventory-categories", "camporee-event-types"].map(entry),
  },
];

export interface CatalogRailItem {
  href: string;
  label: string;
  count?: number;
}

export interface CatalogRailGroup {
  label: string;
  items: CatalogRailItem[];
}

export interface BuildCatalogRailOptions {
  /** True when the user may open that catalog (same predicate as the page gate). */
  canOpen: (entry: CatalogRailEntry) => boolean;
  catalogLabel: (entry: CatalogRailEntry) => string;
  groupLabel: (id: CatalogRailGroupId) => string;
  /** Optional per-catalog count, by screen id. Omitted when the backend has no cheap source. */
  counts?: Readonly<Record<string, number | undefined>>;
  groups?: readonly CatalogRailGroupDef[];
}

/** Rail groups limited to the catalogs the user can open; empty groups are dropped. */
export function buildCatalogRailGroups({
  canOpen,
  catalogLabel,
  groupLabel,
  counts,
  groups = CATALOG_RAIL_GROUPS,
}: BuildCatalogRailOptions): CatalogRailGroup[] {
  const result: CatalogRailGroup[] = [];
  for (const group of groups) {
    const items: CatalogRailItem[] = [];
    for (const item of group.entries) {
      if (!canOpen(item)) continue;
      const count = counts?.[item.id];
      items.push({
        href: item.url,
        label: catalogLabel(item),
        ...(count !== undefined ? { count } : {}),
      });
    }
    if (items.length > 0) result.push({ label: groupLabel(group.id), items });
  }
  return result;
}

/** Destination of the index route: the first catalog the user can open. */
export function firstVisibleCatalogHref(groups: readonly CatalogRailGroup[]): string | null {
  return groups[0]?.items[0]?.href ?? null;
}

/**
 * Detail pages (`/catalogs/classes/12`, `/catalogs/master-honors/3`) carry their
 * own header and do not show the rail; only the list pages do.
 */
export function isCatalogDetailPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = (pathname.split("?")[0] ?? pathname).replace(/\/+$/, "");
  if (!path.startsWith(`${CATALOGS_BASE_PATH}/`)) return false;
  return path.slice(CATALOGS_BASE_PATH.length + 1).split("/").length > 1;
}
