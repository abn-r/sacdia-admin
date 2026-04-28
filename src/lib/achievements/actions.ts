"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createAchievementCategory,
  updateAchievementCategory,
  deleteAchievementCategory,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  type AchievementCategoryPayload,
  type AchievementPayload,
  type AchievementType,
  type AchievementTier,
  type AchievementScope,
  type AchievementCriteria,
} from "@/lib/api/achievements";
import { requireAdminUser } from "@/lib/auth/session";

type AchievementsTranslator = Awaited<
  ReturnType<typeof getTranslations<"achievements">>
>;

const ACHIEVEMENTS_PATH = "/dashboard/achievements";

export type AchievementActionState = {
  error?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readString(formData: FormData, fieldName: string): string {
  return String(formData.get(fieldName) ?? "").trim();
}

function parseBool(formData: FormData, fieldName: string): boolean {
  const val = formData.get(fieldName);
  return val === "on" || val === "true";
}

function parsePositiveNumber(formData: FormData, fieldName: string): number | null {
  const raw = readString(formData, fieldName);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function parseNumber(formData: FormData, fieldName: string): number | null {
  const raw = readString(formData, fieldName);
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

// ─── Category Actions ─────────────────────────────────────────────────────────

function buildCategoryPayload(
  t: AchievementsTranslator,
  formData: FormData,
): AchievementCategoryPayload {
  const name = readString(formData, "name");
  if (!name) throw new Error(t("validation.category_name_required"));

  const display_order = parseNumber(formData, "display_order");

  return {
    name,
    description: readString(formData, "description") || undefined,
    icon: readString(formData, "icon") || undefined,
    display_order: display_order !== null ? display_order : undefined,
    active: formData.has("active") ? parseBool(formData, "active") : true,
  };
}

export async function createAchievementCategoryAction(
  _: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  await requireAdminUser();
  const t = await getTranslations("achievements");

  try {
    const payload = buildCategoryPayload(t, formData);
    await createAchievementCategory(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_category_failed"), {
        endpointLabel: "/achievement-categories",
      }),
    };
  }

  revalidatePath(ACHIEVEMENTS_PATH);
  redirect(ACHIEVEMENTS_PATH);
}

export async function updateAchievementCategoryAction(
  _: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  await requireAdminUser();
  const t = await getTranslations("achievements");

  const categoryId = parsePositiveNumber(formData, "id");
  if (!categoryId) return { error: t("validation.category_edit_not_identified") };

  try {
    const payload = buildCategoryPayload(t, formData);
    await updateAchievementCategory(categoryId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_category_failed"), {
        endpointLabel: `/achievement-categories/${categoryId}`,
      }),
    };
  }

  revalidatePath(ACHIEVEMENTS_PATH);
  redirect(ACHIEVEMENTS_PATH);
}

export async function deleteAchievementCategoryAction(
  _: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  await requireAdminUser();
  const t = await getTranslations("achievements");

  const categoryId = parsePositiveNumber(formData, "id");
  if (!categoryId) return { error: t("validation.category_delete_not_identified") };

  try {
    await deleteAchievementCategory(categoryId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.delete_category_failed"), {
        endpointLabel: `/achievement-categories/${categoryId}`,
      }),
    };
  }

  revalidatePath(ACHIEVEMENTS_PATH);
  redirect(ACHIEVEMENTS_PATH);
}

// ─── Achievement Actions ──────────────────────────────────────────────────────

function buildAchievementPayload(
  t: AchievementsTranslator,
  formData: FormData,
): AchievementPayload {
  const name = readString(formData, "name");
  if (!name) throw new Error(t("validation.achievement_name_required"));

  const type = readString(formData, "type") as AchievementType;
  if (!type) throw new Error(t("validation.type_required"));

  const tier = readString(formData, "tier") as AchievementTier;
  if (!tier) throw new Error(t("validation.tier_required"));

  const scope = readString(formData, "scope") as AchievementScope;
  if (!scope) throw new Error(t("validation.scope_required"));

  const points = parsePositiveNumber(formData, "points");
  if (points === null) throw new Error(t("validation.points_positive"));

  const criteriaRaw = readString(formData, "criteria");
  let criteria: AchievementCriteria;
  try {
    criteria = JSON.parse(criteriaRaw) as AchievementCriteria;
  } catch {
    throw new Error(t("validation.criteria_invalid"));
  }

  const category_id = parsePositiveNumber(formData, "category_id");
  const prerequisite_id = parsePositiveNumber(formData, "prerequisite_id");
  const max_repeats = parsePositiveNumber(formData, "max_repeats");
  const repeatable = parseBool(formData, "repeatable");

  return {
    name,
    description: readString(formData, "description") || undefined,
    type,
    tier,
    scope,
    points,
    criteria,
    secret: parseBool(formData, "secret"),
    repeatable,
    max_repeats: repeatable && max_repeats ? max_repeats : undefined,
    category_id: category_id ?? undefined,
    prerequisite_id: prerequisite_id ?? undefined,
    active: formData.has("active") ? parseBool(formData, "active") : true,
  };
}

export async function createAchievementAction(
  _: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  await requireAdminUser();
  const t = await getTranslations("achievements");

  const categoryId = parsePositiveNumber(formData, "category_id");

  try {
    const payload = buildAchievementPayload(t, formData);
    await createAchievement(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_achievement_failed"), {
        endpointLabel: "/achievements",
      }),
    };
  }

  const redirectPath = categoryId
    ? `${ACHIEVEMENTS_PATH}/${categoryId}`
    : ACHIEVEMENTS_PATH;

  revalidatePath(redirectPath);
  redirect(redirectPath);
}

export async function updateAchievementAction(
  _: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  await requireAdminUser();
  const t = await getTranslations("achievements");

  const achievementId = parsePositiveNumber(formData, "id");
  if (!achievementId) return { error: t("validation.achievement_edit_not_identified") };

  const categoryId = parsePositiveNumber(formData, "category_id");

  try {
    const payload = buildAchievementPayload(t, formData);
    await updateAchievement(achievementId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_achievement_failed"), {
        endpointLabel: `/achievements/${achievementId}`,
      }),
    };
  }

  const redirectPath = categoryId
    ? `${ACHIEVEMENTS_PATH}/${categoryId}`
    : ACHIEVEMENTS_PATH;

  revalidatePath(redirectPath);
  redirect(redirectPath);
}

export async function deleteAchievementAction(
  _: AchievementActionState,
  formData: FormData,
): Promise<AchievementActionState> {
  await requireAdminUser();
  const t = await getTranslations("achievements");

  const achievementId = parsePositiveNumber(formData, "id");
  if (!achievementId) return { error: t("validation.achievement_delete_not_identified") };

  const categoryId = parsePositiveNumber(formData, "category_id");

  try {
    await deleteAchievement(achievementId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.delete_achievement_failed"), {
        endpointLabel: `/achievements/${achievementId}`,
      }),
    };
  }

  const redirectPath = categoryId
    ? `${ACHIEVEMENTS_PATH}/${categoryId}`
    : ACHIEVEMENTS_PATH;

  revalidatePath(redirectPath);
  redirect(redirectPath);
}
