"use client";

import { useMemo } from "react";
import { usePermissions } from "@/lib/auth/use-permissions";

const USERS_CREATE_PERMISSION = "users:create";

const ROLES_ALLOWED_TO_CREATE_USERS = [
  "super-admin",
  "admin",
  "director-dia",
  "assistant-dia",
  "director-union",
  "assistant-union",
  "director-lf",
  "assistant-lf",
] as const;

export function useCanManageUsers(): boolean {
  const { can, hasRole, isSuperAdmin } = usePermissions();

  return useMemo(() => {
    if (isSuperAdmin) return true;
    if (can(USERS_CREATE_PERMISSION)) return true;
    return ROLES_ALLOWED_TO_CREATE_USERS.some((r) => hasRole(r));
  }, [can, hasRole, isSuperAdmin]);
}
