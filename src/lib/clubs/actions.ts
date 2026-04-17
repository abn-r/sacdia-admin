"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createClub,
  createClubSection,
  createClubRoleAssignment,
  deleteClub,
  listClubSections,
  revokeClubRoleAssignment,
  updateClub,
  updateClubSection,
  updateClubRoleAssignment,
  type ClubSection,
} from "@/lib/api/clubs";
import { unwrapList, unwrapObject } from "@/lib/api/response";
import { requireAdminUser } from "@/lib/auth/session";

export type ClubSectionSyncResult = {
  action: "created" | "updated" | "deactivated" | "unchanged" | "failed";
  ok: boolean;
  message: string;
  sectionId?: number;
};

export type ClubActionState = {
  error?: string;
  success?: string;
  createdClubId?: number;
  sectionResults?: ClubSectionSyncResult[];
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function buildClubSectionPath(clubId: number, sectionId: number) {
  return `/dashboard/clubs/${clubId}/sections/${sectionId}`;
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

function parseCoordinates(formData: FormData) {
  const latRaw = readString(formData, "coordinates_lat");
  const lngRaw = readString(formData, "coordinates_lng");

  if (!latRaw && !lngRaw) {
    return undefined;
  }

  if (!latRaw || !lngRaw) {
    throw new Error("Para guardar coordenadas debes capturar latitud y longitud");
  }

  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Las coordenadas no son validas");
  }

  return { lat, lng };
}

function parseOptionalPositiveNumber(formData: FormData, fieldName: string) {
  const value = readString(formData, fieldName);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`El campo ${fieldName} no es valido`);
  }

  return parsed;
}

function buildCreatePayload(formData: FormData) {
  const name = readString(formData, "name");
  if (!name) {
    throw new Error("El nombre del club es obligatorio");
  }

  return {
    name,
    description: readString(formData, "description") || undefined,
    local_field_id: parseRequiredNumber(formData, "local_field_id", "Campo local"),
    district_id: parseRequiredNumber(formData, "district_id", "Distrito"),
    church_id: parseRequiredNumber(formData, "church_id", "Iglesia"),
    address: readString(formData, "address") || undefined,
    coordinates: parseCoordinates(formData),
  };
}

function buildUpdatePayload(formData: FormData) {
  const payload: Record<string, unknown> = {};

  const name = readString(formData, "name");
  const description = readString(formData, "description");
  const address = readString(formData, "address");

  if (name) {
    payload.name = name;
  }

  if (description) {
    payload.description = description;
  }

  if (address) {
    payload.address = address;
  }

  const localFieldId = parseOptionalNumber(formData, "local_field_id");
  const districtId = parseOptionalNumber(formData, "district_id");
  const churchId = parseOptionalNumber(formData, "church_id");

  if (localFieldId !== undefined) {
    payload.local_field_id = localFieldId;
  }

  if (districtId !== undefined) {
    payload.district_id = districtId;
  }

  if (churchId !== undefined) {
    payload.church_id = churchId;
  }

  const coordinates = parseCoordinates(formData);
  if (coordinates) {
    payload.coordinates = coordinates;
  }

  if (formData.has("active")) {
    payload.active = formData.get("active") === "on" || formData.get("active") === "true";
  }

  if (Object.keys(payload).length === 0) {
    throw new Error("No hay cambios para guardar");
  }

  return payload;
}

function normalizeCreatedClubId(payload: unknown) {
  const createdClub = unwrapObject<Record<string, unknown>>(payload);
  const candidateIds = [createdClub?.club_id, createdClub?.id];
  for (const candidateId of candidateIds) {
    const parsed = Number(candidateId);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeCreatedSectionId(payload: unknown) {
  const created = unwrapObject<Record<string, unknown>>(payload);
  const candidateIds = [created?.club_section_id, created?.id];
  for (const candidateId of candidateIds) {
    const parsed = Number(candidateId);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

export async function createClubAction(
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  try {
    const payload = buildCreatePayload(formData);
    await createClub(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el club", {
        endpointLabel: "/clubs",
      }),
    };
  }

  revalidatePath("/dashboard/clubs");
  redirect("/dashboard/clubs");
}

export async function createClubWithSectionsAction(
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  let clubId: number | null = null;

  try {
    const payload = buildCreatePayload(formData);
    const createdPayload = await createClub(payload);
    clubId = normalizeCreatedClubId(createdPayload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el club", {
        endpointLabel: "/clubs",
      }),
    };
  }

  if (!clubId) {
    return {
      error: "Club creado, pero no se pudo resolver su ID para continuar con secciones.",
    };
  }

  // Parse sections from form — form fields: section_club_type_id_0, section_name_0, etc.
  const sectionResults: ClubSectionSyncResult[] = [];
  let idx = 0;
  while (formData.has(`section_club_type_id_${idx}`)) {
    const clubTypeId = Number(readString(formData, `section_club_type_id_${idx}`));
    const sectionName = readString(formData, `section_name_${idx}`);

    if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
      idx++;
      continue;
    }

    try {
      const result = await createClubSection(clubId, {
        club_type_id: clubTypeId,
        name: sectionName || undefined,
      });
      sectionResults.push({
        action: "created",
        ok: true,
        message: "Sección creada.",
        sectionId: normalizeCreatedSectionId(result),
      });
    } catch (error) {
      sectionResults.push({
        action: "failed",
        ok: false,
        message: getActionErrorMessage(error, "No se pudo crear la sección", {
          endpointLabel: `/clubs/${clubId}/sections`,
        }),
      });
    }
    idx++;
  }

  revalidatePath("/dashboard/clubs");
  revalidatePath(`/dashboard/clubs/${clubId}`);

  const failed = sectionResults.filter((r) => !r.ok);
  if (failed.length > 0) {
    return {
      error: "El club se creó, pero una o más secciones fallaron.",
      success: "Puedes continuar al detalle del club y reintentar las secciones fallidas.",
      createdClubId: clubId,
      sectionResults,
    };
  }

  redirect(`/dashboard/clubs/${clubId}`);
}

export async function updateClubAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  try {
    const payload = buildUpdatePayload(formData);
    await updateClub(clubId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el club", {
        endpointLabel: `/clubs/${clubId}`,
      }),
    };
  }

  revalidatePath("/dashboard/clubs");
  revalidatePath(`/dashboard/clubs/${clubId}`);
  redirect("/dashboard/clubs");
}

export async function syncClubSectionsAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  const sectionIdRaw = readString(formData, "section_id");
  const name = readString(formData, "name");
  const clubTypeIdRaw = readString(formData, "club_type_id");
  const activeRaw = readString(formData, "active");

  const sectionId = sectionIdRaw ? Number(sectionIdRaw) : null;
  const clubTypeId = clubTypeIdRaw ? Number(clubTypeIdRaw) : null;

  if (!clubTypeId || !Number.isFinite(clubTypeId)) {
    return { error: "Tipo de club obligatorio." };
  }

  try {
    if (sectionId && Number.isFinite(sectionId)) {
      // Update existing section
      const payload: Record<string, unknown> = {};
      if (name) payload.name = name;
      if (clubTypeId) payload.club_type_id = clubTypeId;
      if (activeRaw) payload.active = activeRaw === "true";

      await updateClubSection(clubId, sectionId, payload);
      revalidatePath(`/dashboard/clubs/${clubId}`);
      return { success: "Sección actualizada correctamente." };
    } else {
      // Create new section
      await createClubSection(clubId, {
        club_type_id: clubTypeId,
        name: name || undefined,
      });
      revalidatePath(`/dashboard/clubs/${clubId}`);
      return { success: "Sección creada correctamente." };
    }
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo sincronizar la sección", {
        endpointLabel: `/clubs/${clubId}/sections`,
      }),
    };
  }
}

export async function deleteClubAction(formData: FormData) {
  await requireAdminUser();

  const clubId = Number(formData.get("id"));
  if (!Number.isFinite(clubId) || clubId <= 0) {
    return;
  }

  await deleteClub(clubId);
  revalidatePath("/dashboard/clubs");
  redirect("/dashboard/clubs");
}

export async function createClubSectionAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  const clubTypeIdRaw = readString(formData, "club_type_id");
  const clubTypeId = Number(clubTypeIdRaw);
  if (!Number.isFinite(clubTypeId) || clubTypeId <= 0) {
    return { error: "Tipo de club no válido" };
  }

  const soulsTarget = Number(readString(formData, "souls_target") || "0");
  if (!Number.isFinite(soulsTarget) || soulsTarget < 0) {
    return { error: "Meta de almas debe ser un número positivo" };
  }

  const fee = Number(readString(formData, "fee") || "0");
  if (!Number.isFinite(fee) || fee < 0) {
    return { error: "La cuota debe ser un número positivo" };
  }

  const meetingDayRaw = readString(formData, "meeting_day");
  const meetingTimeRaw = readString(formData, "meeting_time").slice(0, 5) || "09:00";

  const payload: Parameters<typeof createClubSection>[1] = {
    club_type_id: clubTypeId,
  };

  const name = readString(formData, "name");
  if (name) payload.name = name;
  payload.souls_target = soulsTarget;
  payload.fee = fee;
  if (meetingDayRaw) payload.meeting_day = [{ day: meetingDayRaw }];
  payload.meeting_time = [{ time: meetingTimeRaw }];

  try {
    await createClubSection(clubId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la sección", {
        endpointLabel: `/clubs/${clubId}/sections`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  return { success: "Sección creada correctamente" };
}

export async function updateClubSectionAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  const payload: { name?: string; active?: boolean; club_type_id?: number } = {};
  const name = readString(formData, "name");
  if (name) {
    payload.name = name;
  }

  const activeRaw = readString(formData, "active");
  if (activeRaw) {
    if (activeRaw !== "true" && activeRaw !== "false") {
      return { error: "El estado de la sección no es válido" };
    }
    payload.active = activeRaw === "true";
  }

  const clubTypeId = parseOptionalPositiveNumber(formData, "club_type_id");
  if (clubTypeId !== undefined) {
    payload.club_type_id = clubTypeId;
  }

  if (Object.keys(payload).length === 0) {
    return { error: "No hay cambios para guardar en la sección" };
  }

  try {
    await updateClubSection(clubId, sectionId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la sección", {
        endpointLabel: `/clubs/${clubId}/sections/${sectionId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: "Sección actualizada correctamente" };
}

export async function addClubSectionMemberAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  const userId = readString(formData, "user_id");
  if (!userId) {
    return { error: "El ID del usuario es obligatorio" };
  }

  const roleId = readString(formData, "role_id");
  if (!roleId) {
    return { error: "El rol es obligatorio" };
  }

  let ecclesiasticalYearId = 0;
  try {
    ecclesiasticalYearId = parseRequiredNumber(formData, "ecclesiastical_year_id", "Año eclesiástico");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Año eclesiástico inválido" };
  }

  const startDate = readString(formData, "start_date") || new Date().toISOString();
  const endDate = readString(formData, "end_date") || undefined;

  try {
    await createClubRoleAssignment(clubId, sectionId, {
      user_id: userId,
      role_id: roleId,
      ecclesiastical_year_id: ecclesiasticalYearId,
      start_date: startDate,
      ...(endDate ? { end_date: endDate } : {}),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la asignación de rol", {
        endpointLabel: `/clubs/${clubId}/sections/${sectionId}/roles`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: "Asignación creada correctamente" };
}

export async function updateClubSectionMemberRoleAction(
  clubId: number,
  sectionId: number,
  userId: string,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  if (!userId) {
    return { error: "No se pudo identificar al miembro" };
  }

  const assignmentId = readString(formData, "assignment_id");
  if (!assignmentId) {
    return { error: "No se pudo identificar la asignación a actualizar" };
  }

  const roleId = readString(formData, "role_id");
  if (!roleId) {
    return { error: "El rol es obligatorio" };
  }

  let ecclesiasticalYearId = 0;
  try {
    ecclesiasticalYearId = parseRequiredNumber(formData, "ecclesiastical_year_id", "Año eclesiástico");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Año eclesiástico inválido" };
  }

  const startDate = readString(formData, "start_date") || new Date().toISOString();

  try {
    await updateClubRoleAssignment(assignmentId, {
      role_id: roleId,
      ecclesiastical_year_id: ecclesiasticalYearId,
      start_date: startDate,
      status: "active",
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el rol", {
        endpointLabel: `/club-roles/${assignmentId}`,
      }),
    };
  }

  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: "Rol actualizado correctamente" };
}

export async function removeClubSectionMemberAction(
  clubId: number,
  sectionId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  await requireAdminUser();

  const assignmentId = readString(formData, "assignment_id");
  if (!assignmentId) {
    return { error: "No se pudo identificar la asignación a remover" };
  }

  try {
    await revokeClubRoleAssignment(assignmentId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo remover la asignación", {
        endpointLabel: `/club-roles/${assignmentId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubSectionPath(clubId, sectionId));
  return { success: "Asignación removida correctamente" };
}
