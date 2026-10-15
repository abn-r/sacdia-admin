import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { AuthUser } from "@/lib/auth/types";
import { canCapability } from "@/lib/auth/screen-catalog";
import { listPermissions } from "@/lib/rbac/service";
import { ApiError } from "@/lib/api/client";
import type { Permission } from "@/lib/rbac/types";

export const ROLES_LIST_HREF = "/dashboard/configuration/roles";

export type NewRoleFormData = {
  allPermissions: Permission[];
  loadError: string | null;
};

/**
 * Data for the "new role" form, shared by the full page and the intercepted
 * modal. Without `admin-system-roles.manage` it redirects to the roles list.
 */
export async function loadNewRoleFormData(user: AuthUser): Promise<NewRoleFormData> {
  const t = await getTranslations("rbac.pages.rolesNew");
  if (!canCapability(user, "admin-system-roles", "manage")) {
    redirect(ROLES_LIST_HREF);
  }

  let allPermissions: Permission[] = [];
  let loadError: string | null = null;
  try {
    allPermissions = await listPermissions();
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadError");
  }

  return { allPermissions, loadError };
}
