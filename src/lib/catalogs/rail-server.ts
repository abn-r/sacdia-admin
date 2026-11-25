import { getTranslations } from "next-intl/server";

import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";
import type { AuthUser } from "@/lib/auth/types";
import { sidebarItemMessageKey } from "@/navigation/sidebar/sidebar-i18n";

import { buildCatalogRailGroups, type CatalogRailGroup } from "./rail-groups";

/**
 * Rail groups for this user, localised. Only catalogs the user can open (same
 * gate as the page). The backend has no cheap per-catalog count, so no numbers.
 */
export async function getCatalogRailGroups(user: AuthUser): Promise<CatalogRailGroup[]> {
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("admin.catalogs")]);
  const nav = tNav as unknown as NavTranslator;
  return buildCatalogRailGroups({
    canOpen: (entry) => canAccessDashboardPath(user, entry.url),
    catalogLabel: (entry) => {
      const key = sidebarItemMessageKey(entry.id);
      return nav.has(key) ? nav(key) : entry.id;
    },
    groupLabel: (id) => t(`rail.groups.${id}`),
  });
}
