import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Roles accepted by backend catalog-editor controllers that declare
 * `@GlobalRoles('admin', 'super-admin')`. `assistant-admin` is included
 * because GlobalRolesGuard aliases it with `admin`.
 *
 * `catalogs:read` is a shared reference permission (dropdowns, public
 * catalogs). It is not authorization to open `/dashboard/catalogs/*` CRUD.
 */
export const CATALOG_EDITOR_ROLES = [
  "admin",
  "assistant-admin",
  SUPER_ADMIN_ROLE,
] as const;

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
  const roles = new Set(extractRoles(user));
  if (roles.has(SUPER_ADMIN_ROLE)) {
    return true;
  }

  return CATALOG_EDITOR_ROLES.some((role) => roles.has(role));
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
