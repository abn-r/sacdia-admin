"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { isPastorOnlyRoles } from "@/lib/auth/roles";
import { usePermissions } from "@/lib/auth/use-permissions";

import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";

import { filterSidebarItems } from "./filter-sidebar";
import { localizeSidebarItems } from "./sidebar-i18n";
import { sidebarItems, type NavGroup } from "./sidebar-items";

export function useSidebarItems(): NavGroup[] {
  const tNav = useTranslations("nav") as unknown as NavTranslator;
  const { canAny, canAll, hasRole, isSuperAdmin, roles } = usePermissions();

  return useMemo(
    () =>
      localizeSidebarItems(
        filterSidebarItems(sidebarItems, {
          canAny,
          canAll,
          hasAnyRole: (roles) => roles.some((role) => hasRole(role)),
          isSuperAdmin,
          pastorOnly: isPastorOnlyRoles(roles),
        }),
        tNav,
      ),
    [canAll, canAny, hasRole, isSuperAdmin, roles, tNav],
  );
}
