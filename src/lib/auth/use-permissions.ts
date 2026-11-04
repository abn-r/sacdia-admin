"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import type { CapabilityKey } from "@/lib/auth/generated/capability-keys";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { extractCapabilities, extractPermissions } from "@/lib/auth/permission-utils";

function normalizePermission(permission: string) {
  return permission.trim().toLowerCase();
}

/**
 * Hook para verificar permisos y capabilities del usuario autenticado.
 * Fuente oficial: `authorization.effective.permissions` y
 * `authorization.capabilities` resueltas por el backend en `/auth/me`.
 */
export function usePermissions() {
  const { user } = useAuth();

  const roles = useMemo(() => new Set(extractRoles(user)), [user]);
  const isSuperAdmin = useMemo(() => roles.has(SUPER_ADMIN_ROLE), [roles]);

  const permissionSet = useMemo(
    () => new Set(extractPermissions(user)),
    [user],
  );

  const capabilities = useMemo(() => extractCapabilities(user), [user]);

  // Verifica si el usuario tiene UN permiso específico
  const can = useCallback(
    (permission: string): boolean => {
      if (isSuperAdmin) return true;
      return permissionSet.has(normalizePermission(permission));
    },
    [isSuperAdmin, permissionSet],
  );

  // Verifica si tiene AL MENOS UNO de los permisos
  const canAny = useCallback(
    (permissions: string[]): boolean => {
      if (isSuperAdmin) return true;
      return permissions.some((p) => permissionSet.has(normalizePermission(p)));
    },
    [isSuperAdmin, permissionSet],
  );

  // Verifica si tiene TODOS los permisos
  const canAll = useCallback(
    (permissions: string[]): boolean => {
      if (isSuperAdmin) return true;
      return permissions.every((p) => permissionSet.has(normalizePermission(p)));
    },
    [isSuperAdmin, permissionSet],
  );

  /** Capability publicada por el backend (sin bypass: el backend ya lo resolvió). */
  const hasCapability = useCallback(
    (capability: CapabilityKey): boolean => capabilities.has(capability),
    [capabilities],
  );

  const isAdmin = useMemo(() => capabilities.has("admin_panel.access"), [capabilities]);
  const isPastorOnly = useMemo(
    () => capabilities.has("admin_panel.pastor_only"),
    [capabilities],
  );

  return {
    can,
    canAny,
    canAll,
    hasCapability,
    isSuperAdmin,
    isAdmin,
    isPastorOnly,
    permissions: permissionSet,
    capabilities,
    roles,
  };
}
