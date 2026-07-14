"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminHonor,
  deleteAdminHonor,
  updateAdminHonor,
} from "@/lib/api/admin-honors-catalog";
import { honorFormSchema } from "@/lib/catalogs/honors/schema";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  HONORS_CREATE,
  HONORS_DELETE,
  HONORS_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  CATALOG_LOCALES,
  type CatalogTranslation,
} from "@/lib/types/catalog-translation";

const REVALIDATE_PATH = "/dashboard/catalogs/honors";

export type HonorActionState = {
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

function readOptionalInt(formData: FormData, field: string) {
  const raw = readString(formData, field);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

function readLevel(formData: FormData, field: string) {
  const value = Number(readString(formData, field));
  if (!Number.isFinite(value) || value < 1 || value > 3) return undefined;
  return Math.floor(value);
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
  const year = readString(formData, "year");

  const parsed = honorFormSchema.safeParse({
    name: readString(formData, "name"),
    description: description || undefined,
    honor_image: readString(formData, "honor_image"),
    material_url: readString(formData, "material_url"),
    honors_category_id: readPositiveInt(formData, "honors_category_id"),
    club_type_id: readPositiveInt(formData, "club_type_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    approval: readLevel(formData, "approval"),
    skill_level: readLevel(formData, "skill_level"),
    master_honors_id: readOptionalInt(formData, "master_honors_id"),
    year: year || undefined,
    translations: parseTranslations(formData),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createHonorAction(
  _prev: HonorActionState,
  formData: FormData,
): Promise<HonorActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [HONORS_CREATE, CATALOGS_CREATE])) {
      return { error: "No tienes permisos para crear especialidades." };
    }

    const values = parseFormData(formData);
    await createAdminHonor(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la especialidad.", {
        endpointLabel: "POST /admin/honors-catalog",
      }),
    };
  }
}

export async function updateHonorAction(
  _prev: HonorActionState,
  formData: FormData,
): Promise<HonorActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [HONORS_UPDATE, CATALOGS_UPDATE])) {
      return { error: "No tienes permisos para editar especialidades." };
    }

    const honorId = readPositiveInt(formData, "honor_id");
    if (!honorId) {
      return { error: "Identificador de especialidad inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminHonor(honorId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la especialidad.", {
        endpointLabel: "PATCH /admin/honors-catalog/:id",
      }),
    };
  }
}

export async function deleteHonorAction(honorId: number): Promise<HonorActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [HONORS_DELETE, CATALOGS_DELETE])) {
      return { error: "No tienes permisos para eliminar especialidades." };
    }

    if (!Number.isFinite(honorId) || honorId <= 0) {
      return { error: "Identificador de especialidad inválido." };
    }

    await deleteAdminHonor(honorId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar la especialidad.", {
        endpointLabel: "DELETE /admin/honors-catalog/:id",
      }),
    };
  }
}
