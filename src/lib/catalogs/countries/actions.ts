"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminCountry,
  deleteAdminCountry,
  updateAdminCountry,
} from "@/lib/api/admin-countries";
import { countryFormSchema } from "@/lib/catalogs/countries/schema";
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

const REVALIDATE_PATH = "/dashboard/catalogs/countries";

export type CountryActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseFormData(formData: FormData) {
  const parsed = countryFormSchema.safeParse({
    name: readString(formData, "name"),
    abbreviation: readString(formData, "abbreviation"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(firstIssue ?? "Los datos del formulario no son válidos.");
  }

  return parsed.data;
}

export async function createCountryAction(
  _prev: CountryActionState,
  formData: FormData,
): Promise<CountryActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [COUNTRIES_CREATE, CATALOGS_CREATE])) {
      return { error: "No tienes permisos para crear países." };
    }

    const values = parseFormData(formData);
    await createAdminCountry(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el país.", {
        endpointLabel: "POST /admin/countries",
      }),
    };
  }
}

export async function updateCountryAction(
  _prev: CountryActionState,
  formData: FormData,
): Promise<CountryActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [COUNTRIES_UPDATE, CATALOGS_UPDATE])) {
      return { error: "No tienes permisos para editar países." };
    }

    const countryId = Number(readString(formData, "country_id"));
    if (!Number.isFinite(countryId) || countryId <= 0) {
      return { error: "Identificador de país inválido." };
    }

    const values = parseFormData(formData);
    await updateAdminCountry(countryId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el país.", {
        endpointLabel: "PATCH /admin/countries/:id",
      }),
    };
  }
}

export async function deleteCountryAction(countryId: number): Promise<CountryActionState> {
  try {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, [COUNTRIES_DELETE, CATALOGS_DELETE])) {
      return { error: "No tienes permisos para eliminar países." };
    }

    if (!Number.isFinite(countryId) || countryId <= 0) {
      return { error: "Identificador de país inválido." };
    }

    await deleteAdminCountry(countryId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el país.", {
        endpointLabel: "DELETE /admin/countries/:id",
      }),
    };
  }
}
