"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createResourceCategory,
  deleteResourceCategory,
  updateResourceCategory,
  type ResourceCategoryPayload,
} from "@/lib/api/resources";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  RESOURCE_CATEGORIES_CREATE,
  RESOURCE_CATEGORIES_DELETE,
  RESOURCE_CATEGORIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";

const RESOURCE_CATEGORIES_PATH = "/dashboard/resources/categories";

type ResourceCategoriesTranslator = Awaited<
  ReturnType<typeof getTranslations<"resource_categories">>
>;

export type ResourceCategoryActionState = {
  error?: string;
};

function readString(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function parseBool(formData: FormData, field: string) {
  return formData.get(field) === "on" || formData.get(field) === "true";
}

function parsePositiveNumber(formData: FormData, field: string) {
  const raw = readString(formData, field);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function buildCreatePayload(
  t: ResourceCategoriesTranslator,
  formData: FormData,
): ResourceCategoryPayload {
  const name = readString(formData, "name");
  if (!name) throw new Error(t("validation.name_required"));
  return {
    name,
    description: readString(formData, "description") || undefined,
    active: formData.has("active") ? parseBool(formData, "active") : true,
  };
}

function buildUpdatePayload(formData: FormData): Partial<ResourceCategoryPayload> {
  const payload: Partial<ResourceCategoryPayload> = {};
  const name = readString(formData, "name");
  if (name) payload.name = name;
  payload.description = readString(formData, "description") || "";
  if (formData.has("active")) payload.active = parseBool(formData, "active");
  return payload;
}

export async function createResourceCategoryAction(
  _: ResourceCategoryActionState,
  formData: FormData,
): Promise<ResourceCategoryActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("resource_categories");
  if (!hasAnyPermission(user, [RESOURCE_CATEGORIES_CREATE])) {
    return { error: t("errors.no_permission_create") };
  }
  try {
    const payload = buildCreatePayload(t, formData);
    await createResourceCategory(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_failed"), {
        endpointLabel: "/resource-categories",
      }),
    };
  }
  revalidatePath(RESOURCE_CATEGORIES_PATH);
  redirect(RESOURCE_CATEGORIES_PATH);
}

export async function updateResourceCategoryAction(
  _: ResourceCategoryActionState,
  formData: FormData,
): Promise<ResourceCategoryActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("resource_categories");
  if (!hasAnyPermission(user, [RESOURCE_CATEGORIES_UPDATE])) {
    return { error: t("errors.no_permission_update") };
  }
  const id = parsePositiveNumber(formData, "id");
  if (!id) return { error: t("validation.category_not_identified_update") };
  try {
    const payload = buildUpdatePayload(formData);
    await updateResourceCategory(id, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_failed"), {
        endpointLabel: `/resource-categories/${id}`,
      }),
    };
  }
  revalidatePath(RESOURCE_CATEGORIES_PATH);
  redirect(RESOURCE_CATEGORIES_PATH);
}

export async function deleteResourceCategoryAction(
  _: ResourceCategoryActionState,
  formData: FormData,
): Promise<ResourceCategoryActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("resource_categories");
  if (!hasAnyPermission(user, [RESOURCE_CATEGORIES_DELETE])) {
    return { error: t("errors.no_permission_delete") };
  }
  const id = parsePositiveNumber(formData, "id");
  if (!id) return { error: t("validation.category_not_identified_delete") };
  try {
    await deleteResourceCategory(id);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.delete_failed"), {
        endpointLabel: `/resource-categories/${id}`,
      }),
    };
  }
  revalidatePath(RESOURCE_CATEGORIES_PATH);
  redirect(RESOURCE_CATEGORIES_PATH);
}
