"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function buildCategoryPayload(formData: FormData): AchievementCategoryPayload {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre de la categoría es obligatorio");

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

  try {
    const payload = buildCategoryPayload(formData);
    await createAchievementCategory(payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear la categoría",
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

  const categoryId = parsePositiveNumber(formData, "id");
  if (!categoryId) return { error: "No se pudo identificar la categoría a editar." };

  try {
    const payload = buildCategoryPayload(formData);
    await updateAchievementCategory(categoryId, payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar la categoría",
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

  const categoryId = parsePositiveNumber(formData, "id");
  if (!categoryId) return { error: "No se pudo identificar la categoría a eliminar." };

  try {
    await deleteAchievementCategory(categoryId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo eliminar la categoría",
    };
  }

  revalidatePath(ACHIEVEMENTS_PATH);
  redirect(ACHIEVEMENTS_PATH);
}

// ─── Achievement Actions ──────────────────────────────────────────────────────

function buildAchievementPayload(formData: FormData): AchievementPayload {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre del logro es obligatorio");

  const type = readString(formData, "type") as AchievementType;
  if (!type) throw new Error("El tipo de logro es obligatorio");

  const tier = readString(formData, "tier") as AchievementTier;
  if (!tier) throw new Error("El nivel del logro es obligatorio");

  const scope = readString(formData, "scope") as AchievementScope;
  if (!scope) throw new Error("El alcance del logro es obligatorio");

  const points = parsePositiveNumber(formData, "points");
  if (points === null) throw new Error("Los puntos deben ser un número positivo");

  const criteriaRaw = readString(formData, "criteria");
  let criteria: AchievementCriteria;
  try {
    criteria = JSON.parse(criteriaRaw) as AchievementCriteria;
  } catch {
    throw new Error("Los criterios del logro tienen un formato inválido");
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

  const categoryId = parsePositiveNumber(formData, "category_id");

  try {
    const payload = buildAchievementPayload(formData);
    await createAchievement(payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear el logro",
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

  const achievementId = parsePositiveNumber(formData, "id");
  if (!achievementId) return { error: "No se pudo identificar el logro a editar." };

  const categoryId = parsePositiveNumber(formData, "category_id");

  try {
    const payload = buildAchievementPayload(formData);
    await updateAchievement(achievementId, payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar el logro",
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

  const achievementId = parsePositiveNumber(formData, "id");
  if (!achievementId) return { error: "No se pudo identificar el logro a eliminar." };

  const categoryId = parsePositiveNumber(formData, "category_id");

  try {
    await deleteAchievement(achievementId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo eliminar el logro",
    };
  }

  const redirectPath = categoryId
    ? `${ACHIEVEMENTS_PATH}/${categoryId}`
    : ACHIEVEMENTS_PATH;

  revalidatePath(redirectPath);
  redirect(redirectPath);
}
