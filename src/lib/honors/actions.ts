"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { createHonor, updateHonor, type HonorPayload } from "@/lib/api/honors";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  HONORS_CREATE,
  HONORS_DELETE,
  HONORS_UPDATE,
} from "@/lib/auth/permissions";

type HonorsTranslator = Awaited<ReturnType<typeof getTranslations<"honors">>>;

export type HonorActionState = {
  error?: string;
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function parseOptionalNumber(
  t: HonorsTranslator,
  formData: FormData,
  fieldName: string,
) {
  const value = readString(formData, fieldName);
  if (!value) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(t("validation.field_invalid", { field: fieldName }));
  }

  return parsed;
}

function parseBool(formData: FormData, fieldName: string) {
  return formData.get(fieldName) === "on" || formData.get(fieldName) === "true";
}

function buildCreatePayload(
  t: HonorsTranslator,
  formData: FormData,
): HonorPayload {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error(t("validation.honor_name_required"));
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

  const categoryId = parseOptionalNumber(t, formData, "honors_category_id");
  const clubTypeId = parseOptionalNumber(t, formData, "club_type_id");
  const skillLevel = parseOptionalNumber(t, formData, "skill_level");
  const masterHonor = parseOptionalNumber(t, formData, "master_honors");

  if (categoryId !== undefined) payload.honors_category_id = categoryId;
  if (clubTypeId !== undefined) payload.club_type_id = clubTypeId;
  if (skillLevel !== undefined) payload.skill_level = skillLevel;
  if (masterHonor !== undefined) payload.master_honors = masterHonor;

  return payload;
}

function buildUpdatePayload(
  t: HonorsTranslator,
  formData: FormData,
): Partial<HonorPayload> {
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

  const categoryId = parseOptionalNumber(t, formData, "honors_category_id");
  const clubTypeId = parseOptionalNumber(t, formData, "club_type_id");
  const skillLevel = parseOptionalNumber(t, formData, "skill_level");
  const masterHonor = parseOptionalNumber(t, formData, "master_honors");

  if (categoryId !== undefined) payload.honors_category_id = categoryId;
  if (clubTypeId !== undefined) payload.club_type_id = clubTypeId;
  if (skillLevel !== undefined) payload.skill_level = skillLevel;
  if (masterHonor !== undefined) payload.master_honors = masterHonor;

  if (formData.has("active")) {
    payload.active = parseBool(formData, "active");
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(t("validation.no_changes"));
  }

  return payload;
}

export async function createHonorAction(
  _: HonorActionState,
  formData: FormData,
): Promise<HonorActionState> {
  const user = await requireAdminUser();
  const t = await getTranslations("honors");
  const canCreate = hasAnyPermission(user, [HONORS_CREATE]);
  if (!canCreate) {
    return {
      error: t("errors.no_permission_create"),
    };
  }

  try {
    const payload = buildCreatePayload(t, formData);
    await createHonor(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_failed"), {
        endpointLabel: "/honors",
      }),
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
  const t = await getTranslations("honors");
  const canUpdate = hasAnyPermission(user, [HONORS_UPDATE]);
  if (!canUpdate) {
    return {
      error: t("errors.no_permission_update"),
    };
  }

  try {
    const payload = buildUpdatePayload(t, formData);
    await updateHonor(honorId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_failed"), {
        endpointLabel: `/honors/${honorId}`,
      }),
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
  const t = await getTranslations("honors");
  if (!hasAnyPermission(user, [HONORS_DELETE])) {
    return {
      error: t("errors.no_permission_delete"),
    };
  }

  const honorId = Number(formData.get("id"));
  if (!Number.isFinite(honorId) || honorId <= 0) {
    return {
      error: t("validation.honor_not_identified"),
    };
  }

  try {
    await updateHonor(honorId, { active: false });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.delete_failed"), {
        endpointLabel: `/honors/${honorId}`,
      }),
    };
  }

  revalidatePath("/dashboard/honors");
  revalidatePath(`/dashboard/honors/${honorId}`);
  redirect("/dashboard/honors");
}
