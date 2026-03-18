"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createHonorCategory,
  deleteHonorCategory,
  type HonorCategoryPayload,
  updateHonorCategory,
} from "@/lib/api/honor-categories";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  HONOR_CATEGORIES_CREATE,
  HONOR_CATEGORIES_DELETE,
  HONOR_CATEGORIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

const HONOR_CATEGORIES_PATH = "/dashboard/catalogs/honor-categories";

export type HonorCategoryActionState = {
  error?: string;
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function parseBool(formData: FormData, fieldName: string) {
  return formData.get(fieldName) === "on" || formData.get(fieldName) === "true";
}

function parsePositiveNumber(formData: FormData, fieldName: string) {
  const raw = readString(formData, fieldName);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function buildCreatePayload(formData: FormData): HonorCategoryPayload {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error("El nombre de la categoría es obligatorio");
  }

  return {
    name,
    description: readString(formData, "description") || undefined,
    active: formData.has("active") ? parseBool(formData, "active") : true,
  };
}

function buildUpdatePayload(formData: FormData): Partial<HonorCategoryPayload> {
  const payload: Partial<HonorCategoryPayload> = {};

  const name = readString(formData, "name");
  const description = readString(formData, "description");

  if (name) payload.name = name;
  payload.description = description || "";

  if (formData.has("active")) {
    payload.active = parseBool(formData, "active");
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No hay cambios para guardar");
  }

  return payload;
}

export async function createHonorCategoryAction(
  _: HonorCategoryActionState,
  formData: FormData,
): Promise<HonorCategoryActionState> {
  const user = await requireAdminUser();
  const canCreate = hasAnyPermission(user, [HONOR_CATEGORIES_CREATE]);

  if (!canCreate) {
    return {
      error: "No tienes permisos para crear categorías de especialidades.",
    };
  }

  try {
    const payload = buildCreatePayload(formData);
    await createHonorCategory(payload);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo crear la categoría",
    };
  }

  revalidatePath(HONOR_CATEGORIES_PATH);
  redirect(HONOR_CATEGORIES_PATH);
}

export async function updateHonorCategoryAction(
  _: HonorCategoryActionState,
  formData: FormData,
): Promise<HonorCategoryActionState> {
  const user = await requireAdminUser();
  const canUpdate = hasAnyPermission(user, [HONOR_CATEGORIES_UPDATE]);

  if (!canUpdate) {
    return {
      error: "No tienes permisos para editar categorías de especialidades.",
    };
  }

  const honorCategoryId = parsePositiveNumber(formData, "id");
  if (!honorCategoryId) {
    return { error: "No se pudo identificar la categoría a editar." };
  }

  try {
    const payload = buildUpdatePayload(formData);
    await updateHonorCategory(honorCategoryId, payload);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la categoría",
    };
  }

  revalidatePath(HONOR_CATEGORIES_PATH);
  revalidatePath(`${HONOR_CATEGORIES_PATH}/${honorCategoryId}`);
  redirect(HONOR_CATEGORIES_PATH);
}

export async function deleteHonorCategoryAction(
  _: HonorCategoryActionState,
  formData: FormData,
): Promise<HonorCategoryActionState> {
  const user = await requireAdminUser();
  const canDelete = hasAnyPermission(user, [HONOR_CATEGORIES_DELETE]);

  if (!canDelete) {
    return {
      error: "No tienes permisos para eliminar categorías de especialidades.",
    };
  }

  const honorCategoryId = parsePositiveNumber(formData, "id");
  if (!honorCategoryId) {
    return { error: "No se pudo identificar la categoría a eliminar." };
  }

  try {
    await deleteHonorCategory(honorCategoryId);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la categoría",
    };
  }

  revalidatePath(HONOR_CATEGORIES_PATH);
  revalidatePath(`${HONOR_CATEGORIES_PATH}/${honorCategoryId}`);
  redirect(HONOR_CATEGORIES_PATH);
}
