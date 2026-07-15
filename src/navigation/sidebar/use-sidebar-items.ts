"use client";

import { useMemo } from "react";

import { usePermissions } from "@/lib/auth/use-permissions";

import { filterSidebarItems } from "./filter-sidebar";
import { sidebarItems, type NavGroup } from "./sidebar-items";

export function useSidebarItems(): NavGroup[] {
  const { canAny, canAll, isSuperAdmin } = usePermissions();

  return useMemo(
    () =>
      filterSidebarItems(sidebarItems, {
        canAny,
        canAll,
        isSuperAdmin,
      }),
    [canAll, canAny, isSuperAdmin],
  );
}
