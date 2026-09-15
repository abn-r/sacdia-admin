import { getScreenViewAny } from "@/lib/auth/screen-catalog";

import type { NavAccess } from "./nav-access";

export { PAYMENT_ORDERS_PAGE_PERMISSIONS } from "@/lib/auth/screen-catalog";

/**
 * Gate for a sidebar item: explicit `access` override, else the `viewAny` of
 * the screen with the same id in the screen catalog
 * (`src/lib/auth/screen-catalog/`). Unmapped leaves stay hidden.
 */
export function getNavItemAccess(
  item: { id: string; access?: NavAccess },
): NavAccess | undefined {
  return item.access ?? getScreenViewAny(item.id);
}
