"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { extractRoles, ALLOWED_ADMIN_ROLES } from "@/lib/auth/roles";
import { extractPermissions } from "@/lib/auth/permission-utils";

/**
 * Hook para verificar permisos del usuario autenticado.
 *
 * Los permisos vienen del backend (tabla permissions → role_permissions → roles).
 * super_admin tiene acceso total sin verificar permisos individuales.
 *
 * Uso:
 *   const { can, canAny, canAll } = usePermissions();
 *   if (can(USERS_CREATE)) { ... }
 *   if (canAny([USERS_CREATE, USERS_UPDATE])) { ... }
 */
export function usePermissions() {
  const { user } = useAuth();

  const roles = useMemo(() => new Set(extractRoles(user)), [user]);
  const isSuperAdmin = useMemo(() => roles.has("super_admin"), [roles]);

  const permissionSet = useMemo(
    () => new Set(extractPermissions(user)),
    [user],
  );

  // Verifica si el usuario tiene UN permiso específico
  const can = useCallback(
    (permission: string): boolean => {
      if (isSuperAdmin) return true;
      return permissionSet.has(permission);
    },
    [isSuperAdmin, permissionSet],
  );

  // Verifica si tiene AL MENOS UNO de los permisos
  const canAny = useCallback(
    (permissions: string[]): boolean => {
      if (isSuperAdmin) return true;
      return permissions.some((p) => permissionSet.has(p));
    },
    [isSuperAdmin, permissionSet],
  );

  // Verifica si tiene TODOS los permisos
  const canAll = useCallback(
    (permissions: string[]): boolean => {
      if (isSuperAdmin) return true;
      return permissions.every((p) => permissionSet.has(p));
    },
    [isSuperAdmin, permissionSet],
  );

  // Verifica si tiene un rol administrativo válido
  const hasRole = useCallback(
    (role: string): boolean => roles.has(role),
    [roles],
  );

  const isAdmin = useMemo(
    () => ALLOWED_ADMIN_ROLES.some((r) => roles.has(r)),
    [roles],
  );

  return {
    can,
    canAny,
    canAll,
    hasRole,
    isSuperAdmin,
    isAdmin,
    permissions: permissionSet,
    roles,
  };
}
