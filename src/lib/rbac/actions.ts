"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import type { RbacActionState } from "@/lib/rbac/types";
import {
  createPermission,
  updatePermission,
  deletePermission,
  syncRolePermissions,
  assignPermissionsToRole,
  removePermissionFromRole,
  createRole,
  updateRole,
  deactivateRole,
  getRoleWithPermissions,
} from "@/lib/rbac/service";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";
import {
  activePermissionIds,
  validateCopyRolePermissions,
  type CopyRolePermissionsIssue,
} from "@/lib/rbac/copy-role-permissions";

const PERMISSIONS_PATH = "/dashboard/configuration/permissions";
const ROLES_PATH = "/dashboard/configuration/roles";
const MATRIX_PATH = "/dashboard/configuration/matrix";

async function requireSuperAdminUser(): Promise<AuthUser | RbacActionState> {
  const user = await requireAdminUser();
  if (!extractRoles(user).includes(SUPER_ADMIN_ROLE)) {
    const t = await getTranslations("rbac");
    return { error: t("errors.forbidden_super_admin") };
  }
  return user;
}

function isForbidden(
  value: AuthUser | RbacActionState,
): value is RbacActionState {
  return "error" in value && typeof value.error === "string";
}

function copyIssueKey(
  issue: CopyRolePermissionsIssue,
):
  | "copyPermissions.same_role"
  | "copyPermissions.source_protected"
  | "copyPermissions.target_protected"
  | "copyPermissions.source_missing"
  | "copyPermissions.target_missing" {
  switch (issue) {
    case "same_role":
      return "copyPermissions.same_role";
    case "source_protected":
      return "copyPermissions.source_protected";
    case "target_protected":
      return "copyPermissions.target_protected";
    case "source_missing":
      return "copyPermissions.source_missing";
    case "target_missing":
      return "copyPermissions.target_missing";
  }
}

export async function createPermissionAction(
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  const permissionName = String(formData.get("permission_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!permissionName) {
    return { error: t("validation.permission_name_required") };
  }

  if (!/^[a-z_]+:[a-z_]+$/.test(permissionName)) {
    return { error: t("validation.permission_name_format") };
  }

  try {
    await createPermission({
      permission_name: permissionName,
      description: description || undefined,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_permission_failed"), {
        endpointLabel: "/rbac/permissions",
      }),
    };
  }

  revalidatePath(PERMISSIONS_PATH);
  return { ok: true };
}

export async function updatePermissionAction(
  id: string,
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  const permissionName = String(formData.get("permission_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") === "on" || formData.get("active") === "true";

  if (!permissionName) {
    return { error: t("validation.permission_name_required") };
  }

  if (!/^[a-z_]+:[a-z_]+$/.test(permissionName)) {
    return { error: t("validation.permission_name_format") };
  }

  try {
    await updatePermission(id, {
      permission_name: permissionName,
      description: description || undefined,
      active,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_permission_failed"), {
        endpointLabel: `/rbac/permissions/${id}`,
      }),
    };
  }

  revalidatePath(PERMISSIONS_PATH);
  return { ok: true };
}

export async function deletePermissionAction(permissionId: string): Promise<RbacActionState> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  if (!permissionId) {
    return { error: t("errors.update_permission_failed") };
  }

  try {
    await deletePermission(permissionId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_permission_failed"), {
        endpointLabel: `/rbac/permissions/${permissionId}`,
      }),
    };
  }

  revalidatePath(PERMISSIONS_PATH);
  return { ok: true };
}

// ─── Role CRUD Actions ──────────────────────────────────────

export async function createRoleAction(
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  const roleName = String(formData.get("role_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const roleCategory = String(formData.get("role_category") ?? "").trim();
  const permissionIdsRaw = formData.get("permission_ids");
  const permissionIds: string[] = permissionIdsRaw
    ? String(permissionIdsRaw).split(",").filter(Boolean)
    : [];

  if (!roleName) {
    return { error: t("validation.role_name_required") };
  }

  if (!/^[a-z][a-z0-9-]{1,62}[a-z0-9]$/.test(roleName)) {
    return { error: t("validation.role_name_format") };
  }

  if (roleName === "super-admin") {
    return { error: t("validation.role_name_reserved") };
  }

  if (description.length < 10) {
    return { error: t("validation.description_min_length") };
  }

  if (description.length > 500) {
    return { error: t("validation.description_max_length") };
  }

  if (!["GLOBAL", "CLUB"].includes(roleCategory)) {
    return { error: t("validation.role_category_invalid") };
  }

  try {
    await createRole({
      role_name: roleName,
      description,
      role_category: roleCategory as "GLOBAL" | "CLUB",
      permission_ids: permissionIds.length > 0 ? permissionIds : undefined,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_role_failed"), {
        endpointLabel: "/rbac/roles",
      }),
    };
  }

  revalidatePath(ROLES_PATH);
  return { ok: true };
}

export async function updateRoleAction(
  roleId: string,
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  const description = String(formData.get("description") ?? "").trim();
  const permissionIdsRaw = formData.get("permission_ids");
  const permissionIds: string[] = permissionIdsRaw !== null
    ? String(permissionIdsRaw).split(",").filter(Boolean)
    : [];

  if (description.length < 10) {
    return { error: t("validation.description_min_length") };
  }

  if (description.length > 500) {
    return { error: t("validation.description_max_length") };
  }

  try {
    await updateRole(roleId, {
      description,
      permission_ids: permissionIds,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_role_failed"), {
        endpointLabel: `/rbac/roles/${roleId}`,
      }),
    };
  }

  revalidatePath(ROLES_PATH);
  return { ok: true };
}

export async function deactivateRoleAction(
  roleId: string,
): Promise<{ error?: string }> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  try {
    await deactivateRole(roleId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.deactivate_role_failed"), {
        endpointLabel: `/rbac/roles/${roleId}`,
      }),
    };
  }

  revalidatePath(ROLES_PATH);
  return {};
}

export async function syncRolePermissionsAction(
  roleId: string,
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  const permissionIdsRaw = formData.get("permission_ids");
  const permissionIds: string[] = permissionIdsRaw
    ? String(permissionIdsRaw).split(",").filter(Boolean)
    : [];

  try {
    await syncRolePermissions(roleId, permissionIds);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.sync_permissions_failed"), {
        endpointLabel: `/rbac/roles/${roleId}/permissions`,
      }),
    };
  }

  revalidatePath(ROLES_PATH);
  revalidatePath(MATRIX_PATH);
  return { success: t("success.permissions_updated") };
}

export async function toggleRolePermissionAction(
  roleId: string,
  permissionId: string,
  enabled: boolean,
): Promise<RbacActionState> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  if (!roleId || !permissionId) {
    return { error: t("errors.sync_permissions_failed") };
  }

  try {
    if (enabled) {
      await assignPermissionsToRole(roleId, [permissionId]);
    } else {
      await removePermissionFromRole(roleId, permissionId);
    }
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.sync_permissions_failed"), {
        endpointLabel: `/rbac/roles/${roleId}/permissions/${permissionId}`,
      }),
    };
  }

  revalidatePath(ROLES_PATH);
  revalidatePath(MATRIX_PATH);
  return { ok: true };
}

export async function copyRolePermissionsAction(
  sourceRoleId: string,
  targetRoleId: string,
): Promise<RbacActionState> {
  const gate = await requireSuperAdminUser();
  if (isForbidden(gate)) {
    return gate;
  }
  const t = await getTranslations("rbac");

  if (!sourceRoleId || !targetRoleId) {
    return { error: t("copyPermissions.error") };
  }

  try {
    const [source, target] = await Promise.all([
      getRoleWithPermissions(sourceRoleId),
      getRoleWithPermissions(targetRoleId),
    ]);

    const issue = validateCopyRolePermissions(source, target);
    if (issue || !source) {
      return { error: t(copyIssueKey(issue ?? "source_missing")) };
    }

    const permissionIds = activePermissionIds(source);
    await syncRolePermissions(targetRoleId, permissionIds);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("copyPermissions.error"), {
        endpointLabel: `/rbac/roles/${targetRoleId}/permissions`,
      }),
    };
  }

  revalidatePath(ROLES_PATH);
  revalidatePath(MATRIX_PATH);
  return { ok: true, success: t("copyPermissions.success") };
}
