"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RbacActionState } from "@/lib/rbac/types";
import {
  createPermission,
  updatePermission,
  deletePermission,
  syncRolePermissions,
  createRole,
  updateRole,
  deactivateRole,
} from "@/lib/rbac/service";
import { requireAdminUser } from "@/lib/auth/session";

const PERMISSIONS_PATH = "/dashboard/rbac/permissions";
const ROLES_PATH = "/dashboard/rbac/roles";

export async function createPermissionAction(
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  await requireAdminUser();

  const permissionName = String(formData.get("permission_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!permissionName) {
    return { error: "El nombre del permiso es obligatorio" };
  }

  if (!/^[a-z_]+:[a-z_]+$/.test(permissionName)) {
    return { error: "El formato debe ser resource:action (minusculas, separado por :)" };
  }

  try {
    await createPermission({
      permission_name: permissionName,
      description: description || undefined,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear el permiso",
    };
  }

  revalidatePath(PERMISSIONS_PATH);
  redirect(PERMISSIONS_PATH);
}

export async function updatePermissionAction(
  id: string,
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  await requireAdminUser();

  const permissionName = String(formData.get("permission_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const active = formData.get("active") === "on" || formData.get("active") === "true";

  if (!permissionName) {
    return { error: "El nombre del permiso es obligatorio" };
  }

  if (!/^[a-z_]+:[a-z_]+$/.test(permissionName)) {
    return { error: "El formato debe ser resource:action (minusculas, separado por :)" };
  }

  try {
    await updatePermission(id, {
      permission_name: permissionName,
      description: description || undefined,
      active,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar el permiso",
    };
  }

  revalidatePath(PERMISSIONS_PATH);
  redirect(PERMISSIONS_PATH);
}

export async function deletePermissionAction(formData: FormData) {
  await requireAdminUser();

  const id = String(formData.get("id"));

  if (!id) {
    return;
  }

  await deletePermission(id);
  revalidatePath(PERMISSIONS_PATH);
  redirect(PERMISSIONS_PATH);
}

// ─── Role CRUD Actions ──────────────────────────────────────

export async function createRoleAction(
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  await requireAdminUser();

  const roleName = String(formData.get("role_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const roleCategory = String(formData.get("role_category") ?? "").trim();
  const permissionIdsRaw = formData.get("permission_ids");
  const permissionIds: string[] = permissionIdsRaw
    ? String(permissionIdsRaw).split(",").filter(Boolean)
    : [];

  if (!roleName) {
    return { error: "El nombre del rol es obligatorio" };
  }

  if (!/^[a-z_]{3,64}$/.test(roleName)) {
    return { error: "El nombre debe tener entre 3 y 64 caracteres en minúsculas (solo letras y guiones bajos)" };
  }

  if (roleName === "super_admin") {
    return { error: "No se puede crear un rol con el nombre 'super_admin'" };
  }

  if (description.length < 10) {
    return { error: "La descripción debe tener al menos 10 caracteres" };
  }

  if (description.length > 500) {
    return { error: "La descripción no puede superar los 500 caracteres" };
  }

  if (!["GLOBAL", "CLUB"].includes(roleCategory)) {
    return { error: "La categoría debe ser GLOBAL o CLUB" };
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
      error: error instanceof Error ? error.message : "No se pudo crear el rol",
    };
  }

  revalidatePath(ROLES_PATH);
  redirect(ROLES_PATH);
}

export async function updateRoleAction(
  roleId: string,
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
  await requireAdminUser();

  const description = String(formData.get("description") ?? "").trim();
  const permissionIdsRaw = formData.get("permission_ids");
  const permissionIds: string[] = permissionIdsRaw !== null
    ? String(permissionIdsRaw).split(",").filter(Boolean)
    : [];

  if (description.length < 10) {
    return { error: "La descripción debe tener al menos 10 caracteres" };
  }

  if (description.length > 500) {
    return { error: "La descripción no puede superar los 500 caracteres" };
  }

  try {
    await updateRole(roleId, {
      description,
      permission_ids: permissionIds,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar el rol",
    };
  }

  revalidatePath(ROLES_PATH);
  redirect(ROLES_PATH);
}

export async function deactivateRoleAction(
  roleId: string,
): Promise<{ error?: string }> {
  await requireAdminUser();

  try {
    await deactivateRole(roleId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo desactivar el rol",
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
  await requireAdminUser();

  const permissionIdsRaw = formData.get("permission_ids");
  const permissionIds: string[] = permissionIdsRaw
    ? String(permissionIdsRaw).split(",").filter(Boolean)
    : [];

  try {
    await syncRolePermissions(roleId, permissionIds);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudieron sincronizar los permisos",
    };
  }

  revalidatePath(ROLES_PATH);
  return { success: "Permisos actualizados correctamente" };
}
