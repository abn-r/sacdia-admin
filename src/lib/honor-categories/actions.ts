"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
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

type HonorCategoriesTranslator = Awaited<
  ReturnType<typeof getTranslations<"honor_categories">>
>;

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

function buildCreatePayload(
  t: HonorCategoriesTranslator,
  formData: FormData,
): HonorCategoryPayload {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error(t("validation.name_required"));
  }

  return {
    name,
    description: readString(formData, "description") || undefined,
    active: formData.has("active") ? parseBool(formData, "active") : true,
  };
}

function buildUpdatePayload(
  t: HonorCategoriesTranslator,
  formData: FormData,
): Partial<HonorCategoryPayload> {
  const payload: Partial<HonorCategoryPayload> = {};

  const name = readString(formData, "name");
  const description = readString(formData, "description");

  if (name) payload.name = name;
  payload.description = description || "";

  if (formData.has("active")) {
    payload.active = parseBool(formData, "active");
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(t("validation.no_changes"));
  }

  return payload;
}

export async function createHonorCategoryAction(
  _: HonorCategoryActionState,
  formData: FormData,
): Promise<HonorCategoryActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("honor_categories");
  const canCreate = hasAnyPermission(user, [HONOR_CATEGORIES_CREATE]);

  if (!canCreate) {
    return {
      error: t("errors.no_permission_create"),
    };
  }

  try {
    const payload = buildCreatePayload(t, formData);
    await createHonorCategory(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_failed"), {
        endpointLabel: "/honor-categories",
      }),
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
  const t = await getTranslations("honor_categories");
  const canUpdate = hasAnyPermission(user, [HONOR_CATEGORIES_UPDATE]);

  if (!canUpdate) {
    return {
      error: t("errors.no_permission_update"),
    };
  }

  const honorCategoryId = parsePositiveNumber(formData, "id");
  if (!honorCategoryId) {
    return { error: t("validation.category_not_identified_update") };
  }

  try {
    const payload = buildUpdatePayload(t, formData);
    await updateHonorCategory(honorCategoryId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_failed"), {
        endpointLabel: `/honor-categories/${honorCategoryId}`,
      }),
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
  const t = await getTranslations("honor_categories");
  const canDelete = hasAnyPermission(user, [HONOR_CATEGORIES_DELETE]);

  if (!canDelete) {
    return {
      error: t("errors.no_permission_delete"),
    };
  }

  const honorCategoryId = parsePositiveNumber(formData, "id");
  if (!honorCategoryId) {
    return { error: t("validation.category_not_identified_delete") };
  }

  try {
    await deleteHonorCategory(honorCategoryId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.delete_failed"), {
        endpointLabel: `/honor-categories/${honorCategoryId}`,
      }),
    };
  }

  revalidatePath(HONOR_CATEGORIES_PATH);
  revalidatePath(`${HONOR_CATEGORIES_PATH}/${honorCategoryId}`);
  redirect(HONOR_CATEGORIES_PATH);
}
