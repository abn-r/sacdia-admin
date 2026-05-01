"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { extractRoles, ALLOWED_ADMIN_ROLES, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { extractPermissions } from "@/lib/auth/permission-utils";

function normalizePermission(permission: string) {
  return permission.trim().toLowerCase();
}

/**
 * Hook para verificar permisos del usuario autenticado.
 * Fuente oficial: authorization.effective.permissions (+ grants) resuelta por backend.
 */
export function usePermissions() {
  const { user } = useAuth();

  const roles = useMemo(() => new Set(extractRoles(user)), [user]);
  // extractRoles() normalizes underscores to hyphens — use SUPER_ADMIN_ROLE ("super-admin")
  const isSuperAdmin = useMemo(() => roles.has(SUPER_ADMIN_ROLE), [roles]);

  const permissionSet = useMemo(
    () => new Set(extractPermissions(user)),
    [user],
  );

  // Verifica si el usuario tiene UN permiso específico
  const can = useCallback(
    (permission: string): boolean => {
      return permissionSet.has(normalizePermission(permission));
    },
    [permissionSet],
  );

  // Verifica si tiene AL MENOS UNO de los permisos
  const canAny = useCallback(
    (permissions: string[]): boolean => {
      return permissions.some((p) => permissionSet.has(normalizePermission(p)));
    },
    [permissionSet],
  );

  // Verifica si tiene TODOS los permisos
  const canAll = useCallback(
    (permissions: string[]): boolean => {
      return permissions.every((p) => permissionSet.has(normalizePermission(p)));
    },
    [permissionSet],
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
