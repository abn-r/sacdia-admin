"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminChurch,
  deleteAdminChurch,
  updateAdminChurch,
} from "@/lib/api/admin-churches";
import { churchFormSchema } from "@/lib/catalogs/churches/schema";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  CHURCHES_CREATE,
  CHURCHES_DELETE,
  CHURCHES_UPDATE,
  DISTRICTS_DELETE,
  DISTRICTS_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  CATALOG_LOCALES,
  type CatalogTranslation,
} from "@/lib/types/catalog-translation";

const REVALIDATE_PATH = "/dashboard/catalogs/churches";

export type ChurchActionState = {
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
    if (name) {
      result.push({ locale, name });
    }
  }

  return result;
}

function parseFormData(formData: FormData) {
  const parsed = churchFormSchema.safeParse({
    name: readString(formData, "name"),
    district_id: readPositiveInt(formData, "district_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    translations: parseTranslations(formData),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createChurchAction(
  _prev: ChurchActionState,
  formData: FormData,
): Promise<ChurchActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [CHURCHES_CREATE, DISTRICTS_UPDATE, CATALOGS_CREATE])) {
      return { error: "No tienes permisos para crear iglesias." };
    }

    const values = parseFormData(formData);
    await createAdminChurch(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la iglesia.", {
        endpointLabel: "POST /admin/churches",
      }),
    };
  }
}

export async function updateChurchAction(
  _prev: ChurchActionState,
  formData: FormData,
): Promise<ChurchActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [CHURCHES_UPDATE, DISTRICTS_UPDATE, CATALOGS_UPDATE])) {
      return { error: "No tienes permisos para editar iglesias." };
    }

    const churchId = readPositiveInt(formData, "church_id");
    if (!churchId) {
      return { error: "Identificador de iglesia inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminChurch(churchId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la iglesia.", {
        endpointLabel: "PATCH /admin/churches/:id",
      }),
    };
  }
}

export async function deleteChurchAction(churchId: number): Promise<ChurchActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [CHURCHES_DELETE, DISTRICTS_DELETE, CATALOGS_DELETE])) {
      return { error: "No tienes permisos para eliminar iglesias." };
    }

    if (!Number.isFinite(churchId) || churchId <= 0) {
      return { error: "Identificador de iglesia inválido." };
    }

    await deleteAdminChurch(churchId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar la iglesia.", {
        endpointLabel: "DELETE /admin/churches/:id",
      }),
    };
  }
}
