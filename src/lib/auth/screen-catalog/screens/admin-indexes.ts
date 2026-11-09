import {
  ALL_INDEX_LINKS,
  CATALOGS_INDEX_PATH,
  CATALOGS_INDEX_SECTIONS,
  CONFIGURATION_INDEX_PATH,
  CONFIGURATION_INDEX_SECTIONS,
  flattenIndexLinks,
  type IndexPageSection,
} from "@/navigation/sidebar/index-pages";

import type { CapabilityGate, ScreenDefinition } from "../types";

/**
 * Hub pages (`/dashboard/catalogs`, `/dashboard/configuration`). They own no
 * permission of their own: the gate is "the user can reach at least one link",
 * i.e. the `viewAny` of the linked screens (`CapabilityGate.anyOf`). The index
 * pages and the sidebar entries therefore stay consistent with the child
 * gates without a new permission model.
 *
 * `pathMatch: "exact"` keeps unmapped URLs below the hub fail-closed.
 */
function indexScreen(
  id: string,
  path: string,
  titleKey: string,
  sections: readonly IndexPageSection[],
  screens: readonly ScreenDefinition[],
): ScreenDefinition {
  const byId = new Map(screens.map((screen) => [screen.id, screen]));
  const anyOf: CapabilityGate[] = [];
  for (const link of flattenIndexLinks(sections)) {
    const screen = byId.get(link.id);
    if (!screen) {
      throw new Error(`Index page ${id} links to unknown screen "${link.id}"`);
    }
    anyOf.push(screen.viewAny);
  }
  return {
    id,
    path,
    titleKey,
    pathMatch: "exact",
    surfaces: ["admin"],
    viewAny: { permissions: [], anyOf },
    capabilities: [],
  };
}

/** Destination links of both indexes (for tests and the search index). */
export const ADMIN_INDEX_LINK_IDS: readonly string[] = ALL_INDEX_LINKS.map((link) => link.id);

export function buildAdminIndexScreens(
  screens: readonly ScreenDefinition[],
): ScreenDefinition[] {
  return [
    indexScreen("admin-catalogs", CATALOGS_INDEX_PATH, "catalogs_root", CATALOGS_INDEX_SECTIONS, screens),
    indexScreen("admin-settings", CONFIGURATION_INDEX_PATH, "configuration", CONFIGURATION_INDEX_SECTIONS, screens),
  ];
}
