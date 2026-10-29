"use server";

import { catalogActionText, catalogValidationText } from "@/lib/catalogs/action-messages";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminCountry,
  deleteAdminCountry,
  updateAdminCountry,
} from "@/lib/api/admin-countries";
import { countryFormSchema } from "@/lib/catalogs/countries/schema";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

const REVALIDATE_PATH = "/dashboard/catalogs/countries";

export type CountryActionState = {
  ok?: boolean;
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

async function parseFormData(formData: FormData) {
  const parsed = countryFormSchema.safeParse({
    name: readString(formData, "name"),
    abbreviation: readString(formData, "abbreviation"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(await catalogValidationText(firstIssue));
  }

  return parsed.data;
}

export async function createCountryAction(
  _prev: CountryActionState,
  formData: FormData,
): Promise<CountryActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-countries", "create")) {
      return { error: await catalogActionText("countries", "noPermissionCreate") };
    }

    const values = await parseFormData(formData);
    await createAdminCountry(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("countries", "createFailed"), {
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
    if (!canCapability(user, "catalogs-countries", "update")) {
      return { error: await catalogActionText("countries", "noPermissionUpdate") };
    }

    const countryId = Number(readString(formData, "country_id"));
    if (!Number.isFinite(countryId) || countryId <= 0) {
      return { error: await catalogActionText("countries", "invalidId") };
    }

    const values = await parseFormData(formData);
    await updateAdminCountry(countryId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("countries", "updateFailed"), {
        endpointLabel: "PATCH /admin/countries/:id",
      }),
    };
  }
}

export async function deleteCountryAction(countryId: number): Promise<CountryActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-countries", "delete")) {
      return { error: await catalogActionText("countries", "noPermissionDelete") };
    }

    if (!Number.isFinite(countryId) || countryId <= 0) {
      return { error: await catalogActionText("countries", "invalidId") };
    }

    await deleteAdminCountry(countryId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("countries", "deleteFailed"), {
        endpointLabel: "DELETE /admin/countries/:id",
      }),
    };
  }
}
