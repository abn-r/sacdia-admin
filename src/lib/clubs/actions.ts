"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  createClub,
  createClubInstance,
  createClubRoleAssignment,
  deleteClub,
  listClubInstances,
  revokeClubRoleAssignment,
  updateClub,
  updateClubInstance,
  updateClubRoleAssignment,
  type ClubInstance,
  type ClubInstanceType,
} from "@/lib/api/clubs";
import { unwrapList, unwrapObject } from "@/lib/api/response";

const MANAGED_INSTANCE_TYPES = ["adventurers", "pathfinders", "master_guilds"] as const;
type ManagedInstanceType = (typeof MANAGED_INSTANCE_TYPES)[number];

type ClubInstanceSyncInput = {
  type: ManagedInstanceType;
  enabled: boolean;
  name: string;
  clubTypeId: number | null;
};

export type ClubInstanceSyncResult = {
  type: ManagedInstanceType;
  action: "created" | "updated" | "deactivated" | "unchanged" | "failed";
  ok: boolean;
  message: string;
  instanceId?: number;
};

export type ClubActionState = {
  error?: string;
  success?: string;
  createdClubId?: number;
  instanceResults?: ClubInstanceSyncResult[];
};

function readString(formData: FormData, fieldName: string) {
  return String(formData.get(fieldName) ?? "").trim();
}

function parseInstanceType(value: string): ClubInstanceType {
  if (value === "adventurers" || value === "pathfinders" || value === "master_guilds") {
    return value;
  }

  throw new Error("Tipo de instancia no valido");
}

function parseManagedInstanceType(value: string): ManagedInstanceType {
  if (value === "adventurers" || value === "pathfinders" || value === "master_guilds") {
    return value;
  }

  throw new Error("Tipo de instancia no valido");
}

function buildClubInstancePath(clubId: number, instanceType: ClubInstanceType, instanceId: number) {
  return `/dashboard/clubs/${clubId}/instances/${instanceType}/${instanceId}`;
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

function readManagedInstanceInput(formData: FormData, type: ManagedInstanceType): ClubInstanceSyncInput {
  const enabledRaw = readString(formData, `instance_enabled_${type}`);
  const enabled = enabledRaw === "on" || enabledRaw === "true" || enabledRaw === "1";

  const name = readString(formData, `instance_name_${type}`);
  const clubTypeRaw = readString(formData, `instance_club_type_id_${type}`);
  let clubTypeId: number | null = null;
  if (clubTypeRaw) {
    const parsed = Number(clubTypeRaw);
    if (Number.isFinite(parsed) && parsed > 0) {
      clubTypeId = parsed;
    }
  }

  return {
    type,
    enabled,
    name,
    clubTypeId,
  };
}

function readManagedInstanceInputs(formData: FormData) {
  return MANAGED_INSTANCE_TYPES.map((type) => readManagedInstanceInput(formData, type));
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

function normalizeCreatedInstanceId(payload: unknown) {
  const created = unwrapObject<Record<string, unknown>>(payload);
  const candidateIds = [created?.instance_id, created?.id];
  for (const candidateId of candidateIds) {
    const parsed = Number(candidateId);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function getInstanceByType(instances: ClubInstance[], type: ManagedInstanceType) {
  return instances.find((instance) => instance.instance_type === type);
}

async function executeInstanceSyncAction(
  clubId: number,
  input: ClubInstanceSyncInput,
  existingInstance: ClubInstance | undefined,
): Promise<ClubInstanceSyncResult> {
  if (!input.enabled) {
    if (!existingInstance || !existingInstance.active) {
      return {
        type: input.type,
        action: "unchanged",
        ok: true,
        message: "Sin cambios (instancia inactiva o inexistente).",
        instanceId: existingInstance?.instance_id,
      };
    }

    await updateClubInstance(clubId, input.type, existingInstance.instance_id, { active: false });
    return {
      type: input.type,
      action: "deactivated",
      ok: true,
      message: "Instancia desactivada.",
      instanceId: existingInstance.instance_id,
    };
  }

  if (!input.name) {
    return {
      type: input.type,
      action: "failed",
      ok: false,
      message: "Nombre obligatorio para instancias activas.",
      instanceId: existingInstance?.instance_id,
    };
  }

  if (!input.clubTypeId) {
    return {
      type: input.type,
      action: "failed",
      ok: false,
      message: "Tipo de club obligatorio para instancias activas.",
      instanceId: existingInstance?.instance_id,
    };
  }

  if (!existingInstance) {
    const createdPayload = await createClubInstance(clubId, {
      type: input.type,
      name: input.name,
      club_type_id: input.clubTypeId ?? undefined,
    });

    return {
      type: input.type,
      action: "created",
      ok: true,
      message: "Instancia creada.",
      instanceId: normalizeCreatedInstanceId(createdPayload),
    };
  }

  const payload: {
    name?: string;
    active?: boolean;
    club_type_id?: number;
  } = {};

  if (existingInstance.name !== input.name) {
    payload.name = input.name;
  }

  if (!existingInstance.active) {
    payload.active = true;
  }

  if (existingInstance.club_type_id !== input.clubTypeId) {
    payload.club_type_id = input.clubTypeId;
  }

  if (Object.keys(payload).length === 0) {
    return {
      type: input.type,
      action: "unchanged",
      ok: true,
      message: "Sin cambios en la configuracion.",
      instanceId: existingInstance.instance_id,
    };
  }

  await updateClubInstance(clubId, input.type, existingInstance.instance_id, payload);
  return {
    type: input.type,
    action: "updated",
    ok: true,
    message: "Instancia actualizada.",
    instanceId: existingInstance.instance_id,
  };
}

export async function createClubAction(
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
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

export async function createClubWithInstancesAction(
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
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
      error: "Club creado, pero no se pudo resolver su ID para continuar con instancias.",
    };
  }

  const instanceInputs = readManagedInstanceInputs(formData).filter((input) => input.enabled);
  const instanceResults: ClubInstanceSyncResult[] = [];

  for (const input of instanceInputs) {
    try {
      const result = await executeInstanceSyncAction(clubId, input, undefined);
      instanceResults.push(result);
    } catch (error) {
      instanceResults.push({
        type: input.type,
        action: "failed",
        ok: false,
        message: getActionErrorMessage(error, "No se pudo crear la instancia", {
          endpointLabel: `/clubs/${clubId}/instances`,
        }),
      });
    }
  }

  revalidatePath("/dashboard/clubs");
  revalidatePath(`/dashboard/clubs/${clubId}`);

  const failed = instanceResults.filter((result) => !result.ok);
  if (failed.length > 0) {
    return {
      error: "El club se creo, pero una o mas instancias fallaron.",
      success: "Puedes continuar al detalle del club y reintentar las instancias fallidas.",
      createdClubId: clubId,
      instanceResults,
    };
  }

  redirect(`/dashboard/clubs/${clubId}`);
}

export async function updateClubAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
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

export async function syncClubInstancesAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const retryTypeRaw = readString(formData, "instance_retry_type");
  let retryType: ManagedInstanceType | null = null;
  if (retryTypeRaw) {
    try {
      retryType = parseManagedInstanceType(retryTypeRaw);
    } catch {
      return { error: "El tipo de instancia a reintentar no es valido." };
    }
  }

  let instances: ClubInstance[] = [];
  try {
    const instancesPayload = await listClubInstances(clubId);
    instances = unwrapList<ClubInstance>(instancesPayload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo consultar el estado actual de instancias", {
        endpointLabel: `/clubs/${clubId}/instances`,
      }),
    };
  }

  const instanceInputs = readManagedInstanceInputs(formData);
  const instanceResults: ClubInstanceSyncResult[] = [];

  for (const input of instanceInputs) {
    if (retryType && input.type !== retryType) {
      continue;
    }

    const existing = getInstanceByType(instances, input.type);
    try {
      const result = await executeInstanceSyncAction(clubId, input, existing);
      instanceResults.push(result);
    } catch (error) {
      instanceResults.push({
        type: input.type,
        action: "failed",
        ok: false,
        message: getActionErrorMessage(error, "No se pudo sincronizar la instancia", {
          endpointLabel: existing
            ? `/clubs/${clubId}/instances/${input.type}/${existing.instance_id}`
            : `/clubs/${clubId}/instances`,
        }),
        instanceId: existing?.instance_id,
      });
    }
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);

  const failed = instanceResults.filter((result) => !result.ok);
  if (failed.length > 0) {
    return {
      error: "Una o mas instancias no pudieron sincronizarse.",
      instanceResults,
    };
  }

  return {
    success:
      retryType && instanceResults.length === 1
        ? "Instancia reintentada correctamente."
        : "Instancias sincronizadas correctamente.",
    instanceResults,
  };
}

export async function deleteClubAction(formData: FormData) {
  const clubId = Number(formData.get("id"));
  if (!Number.isFinite(clubId) || clubId <= 0) {
    return;
  }

  await deleteClub(clubId);
  revalidatePath("/dashboard/clubs");
  redirect("/dashboard/clubs");
}

export async function createClubInstanceAction(
  clubId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  const instanceTypeRaw = readString(formData, "instance_type");
  let instanceType: ClubInstanceType;
  try {
    instanceType = parseInstanceType(instanceTypeRaw);
  } catch {
    return { error: "Tipo de instancia no válido" };
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
  // Normalize to HH:MM — browsers may send HH:MM:SS with step=60
  const meetingTimeRaw = readString(formData, "meeting_time").slice(0, 5) || "09:00";

  const payload: Parameters<typeof createClubInstance>[1] = {
    type: instanceType,
  };

  const clubTypeRaw = readString(formData, "club_type_id");
  if (clubTypeRaw) {
    const clubTypeId = Number(clubTypeRaw);
    if (Number.isFinite(clubTypeId) && clubTypeId > 0) {
      payload.club_type_id = clubTypeId;
    }
  }

  const name = readString(formData, "name");
  if (name) payload.name = name;
  payload.souls_target = soulsTarget;
  payload.fee = fee;
  if (meetingDayRaw) payload.meeting_day = [{ day: meetingDayRaw }];
  payload.meeting_time = [{ time: meetingTimeRaw }];

  try {
    await createClubInstance(clubId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la instancia", {
        endpointLabel: `/clubs/${clubId}/instances`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  return { success: "Instancia creada correctamente" };
}

export async function updateClubInstanceAction(
  clubId: number,
  instanceTypeValue: string,
  instanceId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  let instanceType: ClubInstanceType;
  try {
    instanceType = parseInstanceType(instanceTypeValue);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tipo de instancia invalido" };
  }

  const payload: { name?: string; active?: boolean; club_type_id?: number } = {};
  const name = readString(formData, "name");
  if (name) {
    payload.name = name;
  }

  const activeRaw = readString(formData, "active");
  if (activeRaw) {
    if (activeRaw !== "true" && activeRaw !== "false") {
      return { error: "El estado de la instancia no es valido" };
    }
    payload.active = activeRaw === "true";
  }

  const clubTypeId = parseOptionalPositiveNumber(formData, "club_type_id");
  if (clubTypeId !== undefined) {
    payload.club_type_id = clubTypeId;
  }

  if (Object.keys(payload).length === 0) {
    return { error: "No hay cambios para guardar en la instancia" };
  }

  try {
    await updateClubInstance(clubId, instanceType, instanceId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la instancia", {
        endpointLabel: `/clubs/${clubId}/instances/${instanceType}/${instanceId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubInstancePath(clubId, instanceType, instanceId));
  return { success: "Instancia actualizada correctamente" };
}

export async function addClubInstanceMemberAction(
  clubId: number,
  instanceTypeValue: string,
  instanceId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  let instanceType: ClubInstanceType;
  try {
    instanceType = parseInstanceType(instanceTypeValue);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tipo de instancia invalido" };
  }

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
    ecclesiasticalYearId = parseRequiredNumber(formData, "ecclesiastical_year_id", "Año eclesiastico");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Año eclesiástico invalido" };
  }

  const startDate = readString(formData, "start_date") || new Date().toISOString();
  const endDate = readString(formData, "end_date") || undefined;

  try {
    await createClubRoleAssignment(clubId, instanceType, instanceId, {
      user_id: userId,
      role_id: roleId,
      ecclesiastical_year_id: ecclesiasticalYearId,
      start_date: startDate,
      ...(endDate ? { end_date: endDate } : {}),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear la asignación de rol", {
        endpointLabel: `/clubs/${clubId}/instances/${instanceType}/${instanceId}/roles`,
      }),
    };
  }

  revalidatePath(`/dashboard/clubs/${clubId}`);
  revalidatePath(buildClubInstancePath(clubId, instanceType, instanceId));
  return { success: "Asignación creada correctamente" };
}

export async function updateClubInstanceMemberRoleAction(
  clubId: number,
  instanceTypeValue: string,
  instanceId: number,
  userId: string,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  if (!userId) {
    return { error: "No se pudo identificar al miembro" };
  }

  const assignmentId = readString(formData, "assignment_id");
  if (!assignmentId) {
    return { error: "No se pudo identificar la asignación a actualizar" };
  }

  let instanceType: ClubInstanceType;
  try {
    instanceType = parseInstanceType(instanceTypeValue);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tipo de instancia invalido" };
  }

  const roleId = readString(formData, "role_id");
  if (!roleId) {
    return { error: "El rol es obligatorio" };
  }

  let ecclesiasticalYearId = 0;
  try {
    ecclesiasticalYearId = parseRequiredNumber(formData, "ecclesiastical_year_id", "Año eclesiastico");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Año eclesiástico invalido" };
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

  revalidatePath(buildClubInstancePath(clubId, instanceType, instanceId));
  return { success: "Rol actualizado correctamente" };
}

export async function removeClubInstanceMemberAction(
  clubId: number,
  instanceTypeValue: string,
  instanceId: number,
  _: ClubActionState,
  formData: FormData,
): Promise<ClubActionState> {
  let instanceType: ClubInstanceType;
  try {
    instanceType = parseInstanceType(instanceTypeValue);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Tipo de instancia invalido" };
  }

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
  revalidatePath(buildClubInstancePath(clubId, instanceType, instanceId));
  return { success: "Asignación removida correctamente" };
}
