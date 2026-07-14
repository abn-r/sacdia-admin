"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminHonorCategory,
  deleteAdminHonorCategory,
  updateAdminHonorCategory,
} from "@/lib/api/admin-honor-categories";
import { honorCategoryFormSchema } from "@/lib/catalogs/honor-categories/schema";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  HONOR_CATEGORIES_CREATE,
  HONOR_CATEGORIES_DELETE,
  HONOR_CATEGORIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  CATALOG_LOCALES,
  type CatalogTranslation,
} from "@/lib/types/catalog-translation";

const REVALIDATE_PATH = "/dashboard/catalogs/honor-categories";

export type HonorCategoryActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function readPositiveInt(formData: FormData, field: string) {
  const value = Number(readString(formData, field));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

function parseTranslations(formData: FormData): CatalogTranslation[] {
  const result: CatalogTranslation[] = [];

  for (const locale of CATALOG_LOCALES) {
    const name = readString(formData, `translation_${locale}_name`);
    const description = readString(formData, `translation_${locale}_description`);
    if (name || description) {
      result.push({
        locale,
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
      });
    }
  }

  return result;
}

function parseFormData(formData: FormData) {
  const description = readString(formData, "description");
  const parsed = honorCategoryFormSchema.safeParse({
    name: readString(formData, "name"),
    description: description || undefined,
    active: formData.get("active") === "on" || formData.get("active") === "true",
    translations: parseTranslations(formData),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createHonorCategoryAction(
  _prev: HonorCategoryActionState,
  formData: FormData,
): Promise<HonorCategoryActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [HONOR_CATEGORIES_CREATE, CATALOGS_CREATE])) {
      return { error: "No tienes permisos para crear categorías de especialidades." };
    }

    const values = parseFormData(formData);
    await createAdminHonorCategory(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la categoría.", {
        endpointLabel: "POST /admin/honor-categories",
      }),
    };
  }
}

export async function updateHonorCategoryAction(
  _prev: HonorCategoryActionState,
  formData: FormData,
): Promise<HonorCategoryActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [HONOR_CATEGORIES_UPDATE, CATALOGS_UPDATE])) {
      return { error: "No tienes permisos para editar categorías de especialidades." };
    }

    const honorCategoryId = readPositiveInt(formData, "honor_category_id");
    if (!honorCategoryId) {
      return { error: "Identificador de categoría inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminHonorCategory(honorCategoryId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la categoría.", {
        endpointLabel: "PATCH /admin/honor-categories/:id",
      }),
    };
  }
}

export async function deleteHonorCategoryAction(
  honorCategoryId: number,
): Promise<HonorCategoryActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [HONOR_CATEGORIES_DELETE, CATALOGS_DELETE])) {
      return { error: "No tienes permisos para eliminar categorías de especialidades." };
    }

    if (!Number.isFinite(honorCategoryId) || honorCategoryId <= 0) {
      return { error: "Identificador de categoría inválido." };
    }

    await deleteAdminHonorCategory(honorCategoryId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar la categoría.", {
        endpointLabel: "DELETE /admin/honor-categories/:id",
      }),
    };
  }
}
