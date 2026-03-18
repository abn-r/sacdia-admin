"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCamporee,
  deleteCamporee,
  registerCamporeeMember,
  removeCamporeeMember,
  updateCamporee,
} from "@/lib/api/camporees";

export type CamporeeActionState = {
  error?: string;
  success?: string;
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function parseRequiredNumber(formData: FormData, fieldName: string, label: string) {
  const value = readString(formData, fieldName);
  if (!value) {
    throw new Error(`El campo ${label} es obligatorio`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`El campo ${label} no es valido`);
  }

  return parsed;
}

function parseOptionalNumber(formData: FormData, fieldName: string) {
  const value = readString(formData, fieldName);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`El campo ${fieldName} no es valido`);
  }

  return parsed;
}

function parseBool(formData: FormData, fieldName: string) {
  return formData.get(fieldName) === "on" || formData.get(fieldName) === "true";
}

function buildCreatePayload(formData: FormData) {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error("El nombre del camporee es obligatorio");
  }

  const startDate = readString(formData, "start_date");
  const endDate = readString(formData, "end_date");
  const place = readString(formData, "local_camporee_place");

  if (!startDate || !endDate) {
    throw new Error("Las fechas de inicio y fin son obligatorias");
  }

  if (!place) {
    throw new Error("El lugar del camporee es obligatorio");
  }

  return {
    name,
    description: readString(formData, "description") || undefined,
    start_date: startDate,
    end_date: endDate,
    local_field_id: parseRequiredNumber(formData, "local_field_id", "Campo local"),
    includes_adventurers: parseBool(formData, "includes_adventurers"),
    includes_pathfinders: parseBool(formData, "includes_pathfinders"),
    includes_master_guides: parseBool(formData, "includes_master_guides"),
    local_camporee_place: place,
    registration_cost: parseOptionalNumber(formData, "registration_cost"),
  };
}

function buildUpdatePayload(formData: FormData) {
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

  const localFieldId = parseOptionalNumber(formData, "local_field_id");
  const registrationCost = parseOptionalNumber(formData, "registration_cost");

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
    throw new Error("No hay cambios para guardar");
  }

  return payload;
}

export async function createCamporeeAction(
  _: CamporeeActionState,
  formData: FormData,
): Promise<CamporeeActionState> {
  try {
    const payload = buildCreatePayload(formData);
    await createCamporee(payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo crear el camporee",
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
  try {
    const payload = buildUpdatePayload(formData);
    await updateCamporee(camporeeId, payload);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo actualizar el camporee",
    };
  }

  revalidatePath("/dashboard/camporees");
  redirect("/dashboard/camporees");
}

export async function deleteCamporeeAction(formData: FormData) {
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
  const userId = readString(formData, "user_id");
  if (!userId) {
    return { error: "El ID del usuario es obligatorio." };
  }

  const camporeeTypeRaw = readString(formData, "camporee_type");
  if (camporeeTypeRaw !== "local" && camporeeTypeRaw !== "union") {
    return { error: "El tipo de camporee debe ser local o union." };
  }

  const clubName = readString(formData, "club_name");
  let insuranceId: number | undefined;

  try {
    insuranceId = parseOptionalNumber(formData, "insurance_id");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Seguro invalido." };
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
      error: error instanceof Error ? error.message : "No se pudo registrar el miembro al camporee",
    };
  }

  revalidatePath(`/dashboard/camporees/${camporeeId}`);
  return { success: "Miembro registrado correctamente." };
}

export async function removeCamporeeMemberAction(
  camporeeId: number,
  _: CamporeeActionState,
  formData: FormData,
): Promise<CamporeeActionState> {
  const userId = readString(formData, "user_id");
  if (!userId) {
    return { error: "No se pudo identificar al miembro a remover." };
  }

  try {
    await removeCamporeeMember(camporeeId, userId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo remover el miembro del camporee",
    };
  }

  revalidatePath(`/dashboard/camporees/${camporeeId}`);
  return { success: "Miembro removido correctamente." };
}
