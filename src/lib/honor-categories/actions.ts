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
import {
  CATALOG_LOCALES,
  type CatalogTranslation,
} from "@/lib/types/catalog-translation";
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

/**
 * Parse translations[N][locale/name/description] from FormData.
 * Skips es locale (backend rejects it). Omits entries with no fields.
 */
function parseTranslations(formData: FormData): CatalogTranslation[] {
  const result: CatalogTranslation[] = [];

  // Collect all indices present
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^translations\[(\d+)\]\[locale\]$/);
    if (match) {
      indices.add(Number(match[1]));
    }
  }

  for (const idx of Array.from(indices).sort((a, b) => a - b)) {
    const locale = readString(formData, `translations[${idx}][locale]`);
    // Guard: only accept known non-es locales
    if (!CATALOG_LOCALES.includes(locale as CatalogTranslation["locale"])) {
      continue;
    }
    const name = readString(formData, `translations[${idx}][name]`) || null;
    const description =
      readString(formData, `translations[${idx}][description]`) || null;
    if (!name && !description) continue;
    result.push({
      locale: locale as CatalogTranslation["locale"],
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
    });
  }

  return result;
}

function buildCreatePayload(
  t: HonorCategoriesTranslator,
  formData: FormData,
): HonorCategoryPayload {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error(t("validation.name_required"));
  }

  const translations = parseTranslations(formData);

  return {
    name,
    description: readString(formData, "description") || undefined,
    active: formData.has("active") ? parseBool(formData, "active") : true,
    ...(translations.length > 0 ? { translations } : {}),
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

  // Only include translations when admin explicitly touched a non-es tab.
  // `translations_dirty` is emitted as a hidden input by TranslationsTabsField
  // when fieldNamePrefix is set. '0' (or absent) = admin never touched a tab
  // → omit key so the backend leaves existing rows intact.
  const translationsDirty = formData.get("translations_dirty");
  if (translationsDirty === "1") {
    payload.translations = parseTranslations(formData);
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
