"use client";

import { useMemo } from "react";

import { usePermissions } from "@/lib/auth/use-permissions";

import { filterSidebarItems } from "./filter-sidebar";
import { sidebarItems, type NavGroup } from "./sidebar-items";

export function useSidebarItems(): NavGroup[] {
  const { canAny, canAll, hasRole, isSuperAdmin } = usePermissions();

  return useMemo(
    () =>
      filterSidebarItems(sidebarItems, {
        canAny,
        canAll,
        hasAnyRole: (roles) => roles.some((role) => hasRole(role)),
        isSuperAdmin,
      }),
    [canAll, canAny, hasRole, isSuperAdmin],
  );
}
