"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createResourceCategory,
  deleteResourceCategory,
  updateResourceCategory,
  type ResourceCategoryPayload,
} from "@/lib/api/resources";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  RESOURCE_CATEGORIES_CREATE,
  RESOURCE_CATEGORIES_DELETE,
  RESOURCE_CATEGORIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

const RESOURCE_CATEGORIES_PATH = "/dashboard/resources/categories";

export type ResourceCategoryActionState = {
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseBool(formData: FormData, field: string) {
  return formData.get(field) === "on" || formData.get(field) === "true";
}

function parsePositiveNumber(formData: FormData, field: string) {
  const raw = readString(formData, field);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function buildCreatePayload(formData: FormData): ResourceCategoryPayload {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre de la categoría es obligatorio.");
  return {
    name,
    description: readString(formData, "description") || undefined,
    active: formData.has("active") ? parseBool(formData, "active") : true,
  };
}

function buildUpdatePayload(formData: FormData): Partial<ResourceCategoryPayload> {
  const payload: Partial<ResourceCategoryPayload> = {};
  const name = readString(formData, "name");
  if (name) payload.name = name;
  payload.description = readString(formData, "description") || "";
  if (formData.has("active")) payload.active = parseBool(formData, "active");
  return payload;
}

export async function createResourceCategoryAction(
  _: ResourceCategoryActionState,
  formData: FormData,
): Promise<ResourceCategoryActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [RESOURCE_CATEGORIES_CREATE])) {
    return { error: "No tienes permisos para crear categorías de recursos." };
  }
  try {
    const payload = buildCreatePayload(formData);
    await createResourceCategory(payload);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo crear la categoría." };
  }
  revalidatePath(RESOURCE_CATEGORIES_PATH);
  redirect(RESOURCE_CATEGORIES_PATH);
}

export async function updateResourceCategoryAction(
  _: ResourceCategoryActionState,
  formData: FormData,
): Promise<ResourceCategoryActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [RESOURCE_CATEGORIES_UPDATE])) {
    return { error: "No tienes permisos para editar categorías de recursos." };
  }
  const id = parsePositiveNumber(formData, "id");
  if (!id) return { error: "No se pudo identificar la categoría a editar." };
  try {
    const payload = buildUpdatePayload(formData);
    await updateResourceCategory(id, payload);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo actualizar la categoría." };
  }
  revalidatePath(RESOURCE_CATEGORIES_PATH);
  redirect(RESOURCE_CATEGORIES_PATH);
}

export async function deleteResourceCategoryAction(
  _: ResourceCategoryActionState,
  formData: FormData,
): Promise<ResourceCategoryActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [RESOURCE_CATEGORIES_DELETE])) {
    return { error: "No tienes permisos para eliminar categorías de recursos." };
  }
  const id = parsePositiveNumber(formData, "id");
  if (!id) return { error: "No se pudo identificar la categoría a eliminar." };
  try {
    await deleteResourceCategory(id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo eliminar la categoría." };
  }
  revalidatePath(RESOURCE_CATEGORIES_PATH);
  redirect(RESOURCE_CATEGORIES_PATH);
}
