"use server";

import { catalogActionText, catalogValidationText } from "@/lib/catalogs/action-messages";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminDivision,
  deleteAdminDivision,
  updateAdminDivision,
} from "@/lib/api/admin-divisions";
import { canCapability } from "@/lib/auth/screen-catalog";
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

async function parseFormData(formData: FormData) {
  const parsed = divisionFormSchema.safeParse({
    code: readString(formData, "code"),
    name: readString(formData, "name"),
    abbreviation: readString(formData, "abbreviation"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    translations: parseTranslations(formData),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(await catalogValidationText(firstIssue));
  }

  return parsed.data;
}

export async function createDivisionAction(
  _prev: DivisionActionState,
  formData: FormData,
): Promise<DivisionActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-divisions", "create")) {
      return { error: await catalogActionText("divisions", "noPermissionCreate") };
    }

    const values = await parseFormData(formData);
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
      error: getActionErrorMessage(error, await catalogActionText("divisions", "createFailed"), {
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
    if (!canCapability(user, "catalogs-divisions", "update")) {
      return { error: await catalogActionText("divisions", "noPermissionUpdate") };
    }

    const divisionId = Number(readString(formData, "division_id"));
    if (!Number.isFinite(divisionId) || divisionId <= 0) {
      return { error: await catalogActionText("divisions", "invalidId") };
    }

    const values = await parseFormData(formData);
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
      error: getActionErrorMessage(error, await catalogActionText("divisions", "updateFailed"), {
        endpointLabel: "PATCH /admin/divisions/:id",
      }),
    };
  }
}

export async function deleteDivisionAction(divisionId: number): Promise<DivisionActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-divisions", "delete")) {
      return { error: await catalogActionText("divisions", "noPermissionDelete") };
    }

    if (!Number.isFinite(divisionId) || divisionId <= 0) {
      return { error: await catalogActionText("divisions", "invalidId") };
    }

    await deleteAdminDivision(divisionId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("divisions", "deleteFailed"), {
        endpointLabel: "DELETE /admin/divisions/:id",
      }),
    };
  }
}
