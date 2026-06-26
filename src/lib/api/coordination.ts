import { apiRequest } from "@/lib/api/client";

export type CoordinatorAssignmentType = "GENERAL" | "ZONE" | "SECTION";

export type CoordinationZoneDistrict = {
  zone_district_id: number;
  zone_id: number;
  districlub_type_id: number;
  active: boolean;
  districts?: {
    districlub_type_id: number;
    name: string;
    active?: boolean;
    local_field_id?: number | null;
  } | null;
};

export type CoordinationZone = {
  zone_id: number;
  local_field_id: number;
  name: string;
  description?: string | null;
  active: boolean;
  districts?: CoordinationZoneDistrict[];
};

export type CoordinatorAssignment = {
  assignment_id: string;
  user_id: string;
  local_field_id: number;
  assignment_type: CoordinatorAssignmentType;
  zone_id?: number | null;
  club_type_id?: number | null;
  club_section_id?: number | null;
  active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  users?: {
    user_id: string;
    email?: string | null;
    name?: string | null;
    paternal_last_name?: string | null;
    maternal_last_name?: string | null;
  } | null;
  coordination_zones?: { zone_id: number; name: string; active?: boolean } | null;
  club_types?: { club_type_id: number; name: string; active?: boolean } | null;
  club_sections?: {
    club_section_id: number;
    name?: string | null;
    active?: boolean;
    club_type_id: number;
    clubs?: { club_id: number; name: string } | null;
    club_types?: { club_type_id: number; name: string } | null;
  } | null;
};

export type CreateCoordinationZonePayload = {
  name: string;
  description?: string;
  active?: boolean;
};

export type CreateCoordinatorAssignmentPayload = {
  user_id: string;
  assignment_type: CoordinatorAssignmentType;
  zone_id?: number;
  club_type_id?: number;
  club_section_id?: number;
  active?: boolean;
  start_date?: string;
  end_date?: string;
};

export type UpdateCoordinatorAssignmentPayload = Partial<CreateCoordinatorAssignmentPayload>;

type ApiEnvelope<T> = { status?: string; data?: T };

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "data" in payload
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export async function listCoordinationZones(localFieldId: number) {
  const payload = await apiRequest<ApiEnvelope<CoordinationZone[]>>(
    `/admin/coordination/local-fields/${localFieldId}/zones`,
  );
  return unwrap(payload) ?? [];
}

export async function createCoordinationZone(
  localFieldId: number,
  payload: CreateCoordinationZonePayload,
) {
  const response = await apiRequest<ApiEnvelope<CoordinationZone>>(
    `/admin/coordination/local-fields/${localFieldId}/zones`,
    { method: "POST", body: payload },
  );
  return unwrap(response);
}

export async function updateCoordinationZone(
  zoneId: number,
  payload: Partial<CreateCoordinationZonePayload>,
) {
  const response = await apiRequest<ApiEnvelope<CoordinationZone>>(
    `/admin/coordination/zones/${zoneId}`,
    { method: "PATCH", body: payload },
  );
  return unwrap(response);
}

export async function assignDistrictToCoordinationZone(
  zoneId: number,
  districtId: number,
) {
  const response = await apiRequest<ApiEnvelope<CoordinationZoneDistrict>>(
    `/admin/coordination/zones/${zoneId}/districts/${districtId}`,
    { method: "POST" },
  );
  return unwrap(response);
}

export async function removeDistrictFromCoordinationZone(
  zoneId: number,
  districtId: number,
) {
  const response = await apiRequest<ApiEnvelope<CoordinationZoneDistrict>>(
    `/admin/coordination/zones/${zoneId}/districts/${districtId}`,
    { method: "DELETE" },
  );
  return unwrap(response);
}

export async function listCoordinatorAssignments(
  localFieldId: number,
  active?: boolean,
) {
  const payload = await apiRequest<ApiEnvelope<CoordinatorAssignment[]>>(
    `/admin/coordination/local-fields/${localFieldId}/assignments`,
    { params: { active } },
  );
  return unwrap(payload) ?? [];
}

export async function createCoordinatorAssignment(
  localFieldId: number,
  payload: CreateCoordinatorAssignmentPayload,
) {
  const response = await apiRequest<ApiEnvelope<CoordinatorAssignment>>(
    `/admin/coordination/local-fields/${localFieldId}/assignments`,
    { method: "POST", body: payload },
  );
  return unwrap(response);
}

export async function updateCoordinatorAssignment(
  assignmentId: string,
  payload: UpdateCoordinatorAssignmentPayload,
) {
  const response = await apiRequest<ApiEnvelope<CoordinatorAssignment>>(
    `/admin/coordination/assignments/${assignmentId}`,
    { method: "PATCH", body: payload },
  );
  return unwrap(response);
}
