import { hasCapability } from "@/lib/auth/permission-utils";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Catalog editor controllers declare `@GlobalRoles('admin', 'super-admin')`;
 * the backend publishes that rule as the `catalogs.edit` capability.
 *
 * `catalogs:read` is a shared reference permission (dropdowns, public
 * catalogs). It is not authorization to open `/dashboard/catalogs/*` CRUD.
 */

/**
 * Catalog routes whose backend does not use GlobalRoles admin/super-admin.
 * Certifications catalog is gated by `certifications:configure` only.
 */
export const CATALOG_EDITOR_EXEMPT_PATH_PREFIXES = [
  "/dashboard/catalogs/certifications",
] as const;

export function canAccessCatalogEditor(
  user: AuthUser | null | undefined,
): boolean {
  return hasCapability(user, "catalogs.edit");
}

export function isCatalogEditorPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? pathname).trim();
  // Fail closed inside the catalogs layout when the proxy header is missing.
  if (!path) {
    return true;
  }
  if (!path.startsWith("/dashboard/catalogs")) {
    return false;
  }

  return !CATALOG_EDITOR_EXEMPT_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
