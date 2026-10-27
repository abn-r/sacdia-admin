import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import {
  getAchievementById,
  listAchievementsAdmin,
  listAchievementCategoriesAdmin,
} from "@/lib/api/achievements";

type GenericRecord = Record<string, unknown>;
type Option = { id: number; name: string };

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  const root = payload as Record<string, unknown> | null;
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data as GenericRecord[];
  const nested = root.data as Record<string, unknown> | null;
  if (nested && Array.isArray(nested.data)) return nested.data as GenericRecord[];
  if (nested && Array.isArray(nested.items)) return nested.items as GenericRecord[];
  return [];
}

function mapCategories(payload: unknown, defaultName: string, categoryId: number) {
  const catItems = extractItems(payload);
  const categories: Option[] = catItems
    .map((item) => ({
      id: toPositiveNumber(item.achievement_category_id ?? item.category_id ?? item.id) ?? 0,
      name: toNonEmptyString(item.name) ?? defaultName,
    }))
    .filter((c) => c.id > 0);
  const match = catItems.find(
    (item) =>
      toPositiveNumber(item.achievement_category_id ?? item.category_id ?? item.id) ===
      categoryId,
  );
  return { categories, matchName: match ? toNonEmptyString(match.name) : null };
}

function mapAchievements(payload: unknown, defaultName: string): Option[] {
  return extractItems(payload)
    .map((item) => ({
      id: toPositiveNumber(item.achievement_id ?? item.id) ?? 0,
      name: toNonEmptyString(item.name) ?? defaultName,
    }))
    .filter((a) => a.id > 0);
}

/** Category achievements list (cancel / dismiss / full-page fallback). */
export function achievementsListHref(categoryId: number | string) {
  return `/dashboard/configuration/achievements/${categoryId}`;
}

export type CreateAchievementFormData = {
  categoryId: number;
  categoryName: string;
  categories: Option[];
  allAchievements: Option[];
  loadError: string | null;
};

/**
 * Data for the "new achievement" form, shared by the full page and the
 * intercepted modal. Bad category id → `notFound()`; list failures surface as
 * `loadError` (429 is swallowed) and the form still renders.
 */
export async function loadCreateAchievementFormData(
  categoryIdParam: string,
): Promise<CreateAchievementFormData> {
  const t = await getTranslations("achievements.pages.detailNew");
  const categoryId = toPositiveNumber(categoryIdParam);
  if (!categoryId) notFound();

  const defaultName = t("defaultName");
  let categories: Option[] = [];
  let allAchievements: Option[] = [];
  let categoryName = t("defaultCategoryName", { id: categoryId });
  let loadError: string | null = null;

  try {
    const [catsPayload, achsPayload] = await Promise.all([
      listAchievementCategoriesAdmin({ limit: 200 }),
      listAchievementsAdmin({ limit: 500 }),
    ]);
    const mapped = mapCategories(catsPayload, defaultName, categoryId);
    categories = mapped.categories;
    if (mapped.matchName) categoryName = mapped.matchName;
    allAchievements = mapAchievements(achsPayload, defaultName);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  return { categoryId, categoryName, categories, allAchievements, loadError };
}

export type EditAchievementFormData = CreateAchievementFormData & {
  achievementId: number;
  achievement: GenericRecord | null;
  achievementName: string;
};

/**
 * Data for the "edit achievement" form, shared by the full page and the
 * intercepted modal. Bad ids / API 404 / missing record without an error →
 * `notFound()`. Other failures surface as `loadError` with `achievement: null`
 * (the form is not rendered then).
 */
export async function loadEditAchievementFormData(
  categoryIdParam: string,
  achievementIdParam: string,
): Promise<EditAchievementFormData> {
  const t = await getTranslations("achievements.pages.detailEdit");
  const categoryId = toPositiveNumber(categoryIdParam);
  const achievementId = toPositiveNumber(achievementIdParam);
  if (!categoryId || !achievementId) notFound();

  const defaultName = t("defaultName");
  let achievement: GenericRecord | null = null;
  let categories: Option[] = [];
  let allAchievements: Option[] = [];
  let categoryName = t("defaultCategoryName", { id: categoryId });
  let loadError: string | null = null;

  try {
    const [achPayload, catsPayload, achsPayload] = await Promise.all([
      getAchievementById(achievementId),
      listAchievementCategoriesAdmin({ limit: 200 }),
      listAchievementsAdmin({ limit: 500 }),
    ]);
    achievement = achPayload as GenericRecord;
    const mapped = mapCategories(catsPayload, defaultName, categoryId);
    categories = mapped.categories;
    if (mapped.matchName) categoryName = mapped.matchName;
    allAchievements = mapAchievements(achsPayload, defaultName);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  if (!achievement && !loadError) notFound();

  const achievementName =
    toNonEmptyString(achievement?.name) ?? t("defaultAchievementName", { id: achievementId });

  return {
    categoryId,
    categoryName,
    categories,
    allAchievements,
    loadError,
    achievementId,
    achievement,
    achievementName,
  };
}
