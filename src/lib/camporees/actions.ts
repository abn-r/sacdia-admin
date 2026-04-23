"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createCamporee,
  deleteCamporee,
  registerCamporeeMember,
  removeCamporeeMember,
  updateCamporee,
} from "@/lib/api/camporees";
import { requireAdminUser } from "@/lib/auth/session";

type CamporeesTranslator = Awaited<
  ReturnType<typeof getTranslations<"camporees">>
>;

export type CamporeeActionState = {
  error?: string;
  success?: string;
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function parseRequiredNumber(
  t: CamporeesTranslator,
  formData: FormData,
  fieldName: string,
  label: string,
) {
  const value = readString(formData, fieldName);
  if (!value) {
    throw new Error(t("validation.field_required", { field: label }));
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(t("validation.field_invalid", { field: label }));
  }

  return parsed;
}

function parseOptionalNumber(
  t: CamporeesTranslator,
  formData: FormData,
  fieldName: string,
) {
  const value = readString(formData, fieldName);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(t("validation.field_invalid", { field: fieldName }));
  }

  return parsed;
}

function parseBool(formData: FormData, fieldName: string) {
  return formData.get(fieldName) === "on" || formData.get(fieldName) === "true";
}

function buildCreatePayload(t: CamporeesTranslator, formData: FormData) {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error(t("validation.name_required"));
  }

  const startDate = readString(formData, "start_date");
  const endDate = readString(formData, "end_date");
  const place = readString(formData, "local_camporee_place");

  if (!startDate || !endDate) {
    throw new Error(t("validation.dates_required"));
  }

  if (!place) {
    throw new Error(t("validation.place_required"));
  }

  return {
    name,
    description: readString(formData, "description") || undefined,
    start_date: startDate,
    end_date: endDate,
    local_field_id: parseRequiredNumber(
      t,
      formData,
      "local_field_id",
      t("fields.local_field"),
    ),
    includes_adventurers: parseBool(formData, "includes_adventurers"),
    includes_pathfinders: parseBool(formData, "includes_pathfinders"),
    includes_master_guides: parseBool(formData, "includes_master_guides"),
    local_camporee_place: place,
    registration_cost: parseOptionalNumber(t, formData, "registration_cost"),
  };
}

function buildUpdatePayload(t: CamporeesTranslator, formData: FormData) {
  const payload: Record<string, unknown> = {};

  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const startDate = readString(formData, "start_date");
  const endDate = readString(formData, "end_date");
  const place = readString(formData, "local_camporee_place");

  if (name) {
    payload.name = name;
  }

  if (description) {
    payload.description = description;
  }

  if (startDate) {
    payload.start_date = startDate;
  }

  if (endDate) {
    payload.end_date = endDate;
  }

  if (place) {
    payload.local_camporee_place = place;
  }

  const localFieldId = parseOptionalNumber(t, formData, "local_field_id");
  const registrationCost = parseOptionalNumber(t, formData, "registration_cost");

  if (localFieldId !== undefined) {
    payload.local_field_id = localFieldId;
  }

  if (registrationCost !== undefined) {
    payload.registration_cost = registrationCost;
  }

  if (formData.has("includes_adventurers")) {
    payload.includes_adventurers = parseBool(formData, "includes_adventurers");
  }

  if (formData.has("includes_pathfinders")) {
    payload.includes_pathfinders = parseBool(formData, "includes_pathfinders");
  }

  if (formData.has("includes_master_guides")) {
    payload.includes_master_guides = parseBool(formData, "includes_master_guides");
  }

  if (formData.has("active")) {
    payload.active = parseBool(formData, "active");
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(t("validation.no_changes"));
  }

  return payload;
}

export async function createCamporeeAction(
  _: CamporeeActionState,
  formData: FormData,
): Promise<CamporeeActionState> {
  await requireAdminUser();
  const t = await getTranslations("camporees");

  try {
    const payload = buildCreatePayload(t, formData);
    await createCamporee(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.create_failed"), {
        endpointLabel: "/camporees",
      }),
    };
  }

  revalidatePath("/dashboard/camporees");
  redirect("/dashboard/camporees");
}

export async function updateCamporeeAction(
  camporeeId: number,
  _: CamporeeActionState,
  formData: FormData,
): Promise<CamporeeActionState> {
  await requireAdminUser();
  const t = await getTranslations("camporees");

  try {
    const payload = buildUpdatePayload(t, formData);
    await updateCamporee(camporeeId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.update_failed"), {
        endpointLabel: `/camporees/${camporeeId}`,
      }),
    };
  }

  revalidatePath("/dashboard/camporees");
  redirect("/dashboard/camporees");
}

export async function deleteCamporeeAction(formData: FormData) {
  await requireAdminUser();

  const camporeeId = Number(formData.get("id"));
  if (!Number.isFinite(camporeeId) || camporeeId <= 0) {
    return;
  }

  await deleteCamporee(camporeeId);
  revalidatePath("/dashboard/camporees");
  redirect("/dashboard/camporees");
}

export async function registerCamporeeMemberAction(
  camporeeId: number,
  _: CamporeeActionState,
  formData: FormData,
): Promise<CamporeeActionState> {
  await requireAdminUser();
  const t = await getTranslations("camporees");

  const userId = readString(formData, "user_id");
  if (!userId) {
    return { error: t("validation.user_id_required") };
  }

  const camporeeTypeRaw = readString(formData, "camporee_type");
  if (camporeeTypeRaw !== "local" && camporeeTypeRaw !== "union") {
    return { error: t("validation.camporee_type_invalid") };
  }

  const clubName = readString(formData, "club_name");
  let insuranceId: number | undefined;

  try {
    insuranceId = parseOptionalNumber(t, formData, "insurance_id");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t("validation.insurance_invalid"),
    };
  }

  try {
    await registerCamporeeMember(camporeeId, {
      user_id: userId,
      camporee_type: camporeeTypeRaw,
      club_name: clubName || undefined,
      insurance_id: insuranceId,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.register_member_failed"), {
        endpointLabel: `/camporees/${camporeeId}/members`,
      }),
    };
  }

  revalidatePath(`/dashboard/camporees/${camporeeId}`);
  return { success: t("success.member_registered") };
}

export async function removeCamporeeMemberAction(
  camporeeId: number,
  _: CamporeeActionState,
  formData: FormData,
): Promise<CamporeeActionState> {
  await requireAdminUser();
  const t = await getTranslations("camporees");

  const userId = readString(formData, "user_id");
  if (!userId) {
    return { error: t("validation.member_remove_not_identified") };
  }

  try {
    await removeCamporeeMember(camporeeId, userId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, t("errors.remove_member_failed"), {
        endpointLabel: `/camporees/${camporeeId}/members/${userId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/camporees/${camporeeId}`);
  return { success: t("success.member_removed") };
}
