"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHonor, updateHonor, type HonorPayload } from "@/lib/api/honors";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles } from "@/lib/auth/roles";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { HONORS_CREATE, HONORS_UPDATE } from "@/lib/auth/permissions";

export type HonorActionState = {
  error?: string;
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function parseOptionalNumber(formData: FormData, fieldName: string) {
  const value = readString(formData, fieldName);
  if (!value) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`El campo ${fieldName} no es valido`);
  }

  return parsed;
}

function parseBool(formData: FormData, fieldName: string) {
  return formData.get(fieldName) === "on" || formData.get(fieldName) === "true";
}

function buildCreatePayload(formData: FormData): HonorPayload {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error("El nombre de la especialidad es obligatorio");
  }

  const payload: HonorPayload = {
    name,
    description: readString(formData, "description") || undefined,
    honor_image: readString(formData, "honor_image") || undefined,
    patch_image: readString(formData, "honor_image") || undefined,
    material_url: readString(formData, "material_url") || undefined,
    year: readString(formData, "year") || undefined,
    active: formData.has("active") ? parseBool(formData, "active") : true,
  };

  const categoryId = parseOptionalNumber(formData, "honors_category_id");
  const clubTypeId = parseOptionalNumber(formData, "club_type_id");
  const skillLevel = parseOptionalNumber(formData, "skill_level");
  const masterHonor = parseOptionalNumber(formData, "master_honors");

  if (categoryId !== undefined) payload.honors_category_id = categoryId;
  if (clubTypeId !== undefined) payload.club_type_id = clubTypeId;
  if (skillLevel !== undefined) payload.skill_level = skillLevel;
  if (masterHonor !== undefined) payload.master_honors = masterHonor;

  return payload;
}

function buildUpdatePayload(formData: FormData): Partial<HonorPayload> {
  const payload: Partial<HonorPayload> = {};

  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const honorImage = readString(formData, "honor_image");
  const materialUrl = readString(formData, "material_url");
  const year = readString(formData, "year");

  if (name) payload.name = name;
  if (description) payload.description = description;
  if (honorImage) {
    payload.honor_image = honorImage;
    payload.patch_image = honorImage;
  }
  if (materialUrl) payload.material_url = materialUrl;
  if (year) payload.year = year;

  const categoryId = parseOptionalNumber(formData, "honors_category_id");
  const clubTypeId = parseOptionalNumber(formData, "club_type_id");
  const skillLevel = parseOptionalNumber(formData, "skill_level");
  const masterHonor = parseOptionalNumber(formData, "master_honors");

  if (categoryId !== undefined) payload.honors_category_id = categoryId;
  if (clubTypeId !== undefined) payload.club_type_id = clubTypeId;
  if (skillLevel !== undefined) payload.skill_level = skillLevel;
  if (masterHonor !== undefined) payload.master_honors = masterHonor;

  if (formData.has("active")) {
    payload.active = parseBool(formData, "active");
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No hay cambios para guardar");
  }

  return payload;
}

export async function createHonorAction(
  _: HonorActionState,
  formData: FormData,
): Promise<HonorActionState> {
  const user = await requireAdminUser();
  const roleSet = new Set(extractRoles(user));
  const canCreate = roleSet.has("super_admin") || hasAnyPermission(user, [HONORS_CREATE]);
  if (!canCreate) {
    return {
      error: "No tienes permisos para crear especialidades.",
    };
  }

  try {
    const payload = buildCreatePayload(formData);
    await createHonor(payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear la especialidad",
    };
  }

  revalidatePath("/dashboard/honors");
  redirect("/dashboard/honors");
}

export async function updateHonorAction(
  honorId: number,
  _: HonorActionState,
  formData: FormData,
): Promise<HonorActionState> {
  const user = await requireAdminUser();
  const roleSet = new Set(extractRoles(user));
  const canUpdate = roleSet.has("super_admin") || hasAnyPermission(user, [HONORS_UPDATE]);
  if (!canUpdate) {
    return {
      error: "No tienes permisos para editar especialidades.",
    };
  }

  try {
    const payload = buildUpdatePayload(formData);
    await updateHonor(honorId, payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar la especialidad",
    };
  }

  revalidatePath("/dashboard/honors");
  revalidatePath(`/dashboard/honors/${honorId}`);
  redirect("/dashboard/honors");
}

export async function deactivateHonorAction(
  _: HonorActionState,
  formData: FormData,
): Promise<HonorActionState> {
  const user = await requireAdminUser();
  const roleSet = new Set(extractRoles(user));

  if (!roleSet.has("super_admin")) {
    return {
      error: "Solo super_admin puede eliminar especialidades.",
    };
  }

  const honorId = Number(formData.get("id"));
  if (!Number.isFinite(honorId) || honorId <= 0) {
    return {
      error: "No se pudo identificar la especialidad a eliminar.",
    };
  }

  try {
    await updateHonor(honorId, { active: false });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo eliminar la especialidad",
    };
  }

  revalidatePath("/dashboard/honors");
  revalidatePath(`/dashboard/honors/${honorId}`);
  redirect("/dashboard/honors");
}
