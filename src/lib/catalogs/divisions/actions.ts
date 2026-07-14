"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminDivision,
  deleteAdminDivision,
  updateAdminDivision,
} from "@/lib/api/admin-divisions";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  COUNTRIES_CREATE,
  COUNTRIES_DELETE,
  COUNTRIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  CATALOG_LOCALES,
  type CatalogTranslation,
} from "@/lib/types/catalog-translation";
import { divisionFormSchema } from "@/lib/catalogs/divisions/schema";

const REVALIDATE_PATH = "/dashboard/catalogs/divisions";

export type DivisionActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
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
  const parsed = divisionFormSchema.safeParse({
    code: readString(formData, "code"),
    name: readString(formData, "name"),
    abbreviation: readString(formData, "abbreviation"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    translations: parseTranslations(formData),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createDivisionAction(
  _prev: DivisionActionState,
  formData: FormData,
): Promise<DivisionActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [COUNTRIES_CREATE, CATALOGS_CREATE])) {
      return { error: "No tienes permisos para crear divisiones." };
    }

    const values = parseFormData(formData);
    await createAdminDivision({
      code: values.code,
      name: values.name,
      abbreviation: values.abbreviation,
      active: values.active,
      translations: values.translations,
    });

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la división.", {
        endpointLabel: "POST /admin/divisions",
      }),
    };
  }
}

export async function updateDivisionAction(
  _prev: DivisionActionState,
  formData: FormData,
): Promise<DivisionActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [COUNTRIES_UPDATE, CATALOGS_UPDATE])) {
      return { error: "No tienes permisos para editar divisiones." };
    }

    const divisionId = Number(readString(formData, "division_id"));
    if (!Number.isFinite(divisionId) || divisionId <= 0) {
      return { error: "Identificador de división inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminDivision(divisionId, {
      code: values.code,
      name: values.name,
      abbreviation: values.abbreviation,
      active: values.active,
      translations: values.translations,
    });

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la división.", {
        endpointLabel: "PATCH /admin/divisions/:id",
      }),
    };
  }
}

export async function deleteDivisionAction(divisionId: number): Promise<DivisionActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [COUNTRIES_DELETE, CATALOGS_DELETE])) {
      return { error: "No tienes permisos para eliminar divisiones." };
    }

    if (!Number.isFinite(divisionId) || divisionId <= 0) {
      return { error: "Identificador de división inválido." };
    }

    await deleteAdminDivision(divisionId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar la división.", {
        endpointLabel: "DELETE /admin/divisions/:id",
      }),
    };
  }
}
