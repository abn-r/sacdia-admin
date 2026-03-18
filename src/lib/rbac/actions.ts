"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RbacActionState } from "@/lib/rbac/types";
import {
  createPermission,
  updatePermission,
  deletePermission,
  syncRolePermissions,
} from "@/lib/rbac/service";

const PERMISSIONS_PATH = "/dashboard/rbac/permissions";
const ROLES_PATH = "/dashboard/rbac/roles";

export async function createPermissionAction(
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
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
  const id = String(formData.get("id"));

  if (!id) {
    return;
  }

  await deletePermission(id);
  revalidatePath(PERMISSIONS_PATH);
  redirect(PERMISSIONS_PATH);
}

export async function syncRolePermissionsAction(
  roleId: string,
  _: RbacActionState,
  formData: FormData,
): Promise<RbacActionState> {
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
