"use server";

import { catalogActionText, catalogValidationText } from "@/lib/catalogs/action-messages";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAdminChurch,
  deleteAdminChurch,
  updateAdminChurch,
} from "@/lib/api/admin-churches";
import { churchFormSchema } from "@/lib/catalogs/churches/schema";
import { canCapability } from "@/lib/auth/screen-catalog";
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

async function parseFormData(formData: FormData) {
  const parsed = churchFormSchema.safeParse({
    name: readString(formData, "name"),
    district_id: readPositiveInt(formData, "district_id"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    translations: parseTranslations(formData),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new Error(await catalogValidationText(firstIssue));
  }

  return parsed.data;
}

export async function createChurchAction(
  _prev: ChurchActionState,
  formData: FormData,
): Promise<ChurchActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-churches", "create")) {
      return { error: await catalogActionText("churches", "noPermissionCreate") };
    }

    const values = await parseFormData(formData);
    await createAdminChurch(values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("churches", "createFailed"), {
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
    if (!canCapability(user, "catalogs-churches", "update")) {
      return { error: await catalogActionText("churches", "noPermissionUpdate") };
    }

    const churchId = readPositiveInt(formData, "church_id");
    if (!churchId) {
      return { error: await catalogActionText("churches", "invalidId") };
    }

    const values = await parseFormData(formData);
    await updateAdminChurch(churchId, values);

    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("churches", "updateFailed"), {
        endpointLabel: "PATCH /admin/churches/:id",
      }),
    };
  }
}

export async function deleteChurchAction(churchId: number): Promise<ChurchActionState> {
  try {
    const user = await requireAdminUser();
    if (!canCapability(user, "catalogs-churches", "delete")) {
      return { error: await catalogActionText("churches", "noPermissionDelete") };
    }

    if (!Number.isFinite(churchId) || churchId <= 0) {
      return { error: await catalogActionText("churches", "invalidId") };
    }

    await deleteAdminChurch(churchId);
    revalidatePath(REVALIDATE_PATH);
    return { ok: true };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, await catalogActionText("churches", "deleteFailed"), {
        endpointLabel: "DELETE /admin/churches/:id",
      }),
    };
  }
}
