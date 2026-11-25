import { getTranslations } from "next-intl/server";

import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import type { AuthUser } from "@/lib/auth/types";

import { buildConfigurationRailGroups, type ConfigurationRailGroup } from "./rail-groups";

/** Rail groups for this user, localised; only screens the user can open. */
export async function getConfigurationRailGroups(user: AuthUser): Promise<ConfigurationRailGroup[]> {
  const t = await getTranslations("admin.configuration");
  return buildConfigurationRailGroups({
    canOpen: (entry) => canAccessDashboardPath(user, entry.url),
    itemLabel: (id) => t(`rail.items.${id}`),
    groupLabel: (id) => t(`rail.groups.${id}`),
  });
}
