import { ApiError, apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type CoordinatorAssignmentType = "GENERAL" | "ZONE" | "SECTION";

export type CoordinationZoneDistrict = {
  zone_district_id: number;
  zone_id: number;
  districlub_type_id: number;
  active: boolean;
  districts?: {
    districlub_type_id: number;
    name: string | null;
    active: boolean;
    local_field_id: number;
  } | null;
};

export type CoordinationZone = {
  zone_id: number;
  local_field_id: number;
  name: string;
  description: string | null;
  active: boolean;
  districts?: CoordinationZoneDistrict[];
};

export type CoordinatorAssignmentUser = {
  user_id: string;
  email: string | null;
  name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
};

export type CoordinatorAssignment = {
  assignment_id: string;
  user_id: string;
  local_field_id: number;
  assignment_type: CoordinatorAssignmentType;
  zone_id: number | null;
  club_type_id: number | null;
  club_section_id: number | null;
  active: boolean;
  start_date: string;
  end_date: string | null;
  users?: CoordinatorAssignmentUser | null;
  coordination_zones?: {
    zone_id: number;
    name: string;
    active: boolean;
  } | null;
  club_types?: {
    club_type_id: number;
    name: string;
    active: boolean;
  } | null;
  club_sections?: {
    club_section_id: number;
    name: string | null;
    active: boolean;
    club_type_id: number;
    clubs?: { club_id: number; name: string | null } | null;
    club_types?: { club_type_id: number; name: string | null } | null;
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

export function extractCoordinationConflictReason(
  error: unknown,
): string | null {
  if (!(error instanceof ApiError)) return null;
  const payload = error.payload;
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const namedArgs =
    root.namedArgs && typeof root.namedArgs === "object"
      ? (root.namedArgs as Record<string, unknown>)
      : null;
  const details =
    root.details && typeof root.details === "object"
      ? (root.details as Record<string, unknown>)
      : null;

  const reason = namedArgs?.reason ?? details?.reason;
  return typeof reason === "string" && reason.length > 0 ? reason : null;
}

export function buildCoordinatorAssignmentPayload(input: {
  userId: string;
  assignmentType: CoordinatorAssignmentType;
  zoneId?: number;
  clubTypeId?: number;
  clubSectionId?: number;
}): CreateCoordinatorAssignmentPayload {
  if (input.assignmentType === "GENERAL") {
    return {
      user_id: input.userId,
      assignment_type: "GENERAL",
    };
  }

  if (input.assignmentType === "ZONE") {
    return {
      user_id: input.userId,
      assignment_type: "ZONE",
      zone_id: input.zoneId,
      club_type_id: input.clubTypeId,
    };
  }

  return {
    user_id: input.userId,
    assignment_type: "SECTION",
    club_section_id: input.clubSectionId,
  };
}

export async function listCoordinationZones(localFieldId: number) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/local-fields/${localFieldId}/zones`,
  );
  return unwrapApiData<CoordinationZone[]>(payload);
}

export async function createCoordinationZone(
  localFieldId: number,
  body: CreateCoordinationZonePayload,
) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/local-fields/${localFieldId}/zones`,
    { method: "POST", body },
  );
  return unwrapApiData<CoordinationZone>(payload);
}

export async function updateCoordinationZone(
  zoneId: number,
  body: Partial<CreateCoordinationZonePayload>,
) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/zones/${zoneId}`,
    { method: "PATCH", body },
  );
  return unwrapApiData<CoordinationZone>(payload);
}

export async function assignDistrictToCoordinationZone(
  zoneId: number,
  districtId: number,
) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/zones/${zoneId}/districts/${districtId}`,
    { method: "POST" },
  );
  return unwrapApiData<CoordinationZoneDistrict>(payload);
}

export async function removeDistrictFromCoordinationZone(
  zoneId: number,
  districtId: number,
) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/zones/${zoneId}/districts/${districtId}`,
    { method: "DELETE" },
  );
  return unwrapApiData<CoordinationZoneDistrict>(payload);
}

export async function listCoordinatorAssignments(
  localFieldId: number,
  active?: boolean,
) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/local-fields/${localFieldId}/assignments`,
    {
      params:
        active === undefined ? undefined : { active: active ? "true" : "false" },
    },
  );
  return unwrapApiData<CoordinatorAssignment[]>(payload);
}

export async function createCoordinatorAssignment(
  localFieldId: number,
  body: CreateCoordinatorAssignmentPayload,
) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/local-fields/${localFieldId}/assignments`,
    { method: "POST", body },
  );
  return unwrapApiData<CoordinatorAssignment>(payload);
}

export async function updateCoordinatorAssignment(
  assignmentId: string,
  body: Partial<CreateCoordinatorAssignmentPayload>,
) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/assignments/${assignmentId}`,
    { method: "PATCH", body },
  );
  return unwrapApiData<CoordinatorAssignment>(payload);
}

export type CoordinatorBackfillSkipReason =
  | "already_has_general"
  | "already_assigned"
  | "director_conflict"
  | "general_slot_taken";

export type CoordinatorBackfillPerson = {
  user_id: string;
  email: string | null;
  name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  role_name: string;
};

export type CoordinatorBackfillResult = {
  dry_run: boolean;
  local_field_id: number;
  existing_general: {
    assignment_id: string;
    user_id: string;
  } | null;
  created: Array<CoordinatorBackfillPerson & { assignment_id: string | null }>;
  skipped: Array<
    CoordinatorBackfillPerson & { reason: CoordinatorBackfillSkipReason }
  >;
};

export async function backfillCoordinatorAssignments(
  localFieldId: number,
  dryRun = true,
) {
  const payload = await apiRequest<unknown>(
    `/admin/coordination/local-fields/${localFieldId}/backfill`,
    { method: "POST", body: { dry_run: dryRun } },
  );
  return unwrapApiData<CoordinatorBackfillResult>(payload);
}
