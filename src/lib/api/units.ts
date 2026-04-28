import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitUser = {
  user_id: string;
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  user_image?: string | null;
};

export type UnitMember = {
  unit_member_id: number;
  user_id: string;
  active: boolean;
  created_at?: string;
  users?: UnitUser | null;
};

export type Unit = {
  unit_id: number;
  name: string;
  active: boolean;
  club_type_id: number;
  club_section_id?: number | null;
  captain_id?: string;
  secretary_id?: string;
  advisor_id?: string;
  substitute_advisor_id?: string | null;
  club_types?: { club_type_id: number; name: string } | null;
  users_units_captain_idTousers?: UnitUser | null;
  users_units_secretary_idTousers?: UnitUser | null;
  users_units_advisor_idTousers?: UnitUser | null;
  users_units_as_substitute_advisor?: UnitUser | null;
  unit_members?: UnitMember[];
};

export type WeeklyRecordScore = {
  category_id: number;
  category_name?: string;
  points: number;
  max_points?: number;
};

export type WeeklyRecord = {
  record_id: number;
  user_id: string;
  week: number;
  year: number;
  attendance: number;
  punctuality: number;
  points: number;
  active: boolean;
  created_at?: string;
  users?: UnitUser | null;
  scores?: WeeklyRecordScore[];
};

export type CreateUnitPayload = {
  name: string;
  captain_id: string;
  secretary_id: string;
  advisor_id: string;
  substitute_advisor_id?: string;
  club_type_id: number;
  club_section_id?: number;
};

export type UpdateUnitPayload = Partial<CreateUnitPayload> & {
  active?: boolean;
};

export type ScoreEntry = {
  category_id: number;
  points: number;
};

export type CreateWeeklyRecordPayload = {
  user_id: string;
  week: number;
  year: number;
  attendance: number;
  punctuality: number;
  scores?: ScoreEntry[];
};

export type UpdateWeeklyRecordPayload = {
  attendance?: number;
  punctuality?: number;
  active?: boolean;
  scores?: ScoreEntry[];
};

// ─── Units ────────────────────────────────────────────────────────────────────

export async function listUnits(clubId: number): Promise<Unit[]> {
  const payload = await apiRequest<unknown>(`/clubs/${clubId}/units`);
  if (Array.isArray(payload)) return payload as Unit[];
  const res = payload as { data?: unknown };
  if (Array.isArray(res.data)) return res.data as Unit[];
  return [];
}

export async function getUnit(clubId: number, unitId: number): Promise<Unit> {
  const payload = await apiRequest<unknown>(`/clubs/${clubId}/units/${unitId}`);
  const res = payload as { data?: unknown };
  if (res.data && typeof res.data === "object") return res.data as Unit;
  return payload as Unit;
}

export async function createUnit(
  clubId: number,
  payload: CreateUnitPayload,
): Promise<Unit> {
  const result = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/units`,
    { method: "POST", body: payload },
  );
  const res = result as { data?: unknown };
  if (res.data && typeof res.data === "object") return res.data as Unit;
  return result as Unit;
}

export async function updateUnit(
  clubId: number,
  unitId: number,
  payload: UpdateUnitPayload,
): Promise<Unit> {
  const result = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/units/${unitId}`,
    { method: "PATCH", body: payload },
  );
  const res = result as { data?: unknown };
  if (res.data && typeof res.data === "object") return res.data as Unit;
  return result as Unit;
}

export async function deleteUnit(
  clubId: number,
  unitId: number,
): Promise<void> {
  await apiRequestFromClient(`/clubs/${clubId}/units/${unitId}`, {
    method: "DELETE",
  });
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function addUnitMember(
  clubId: number,
  unitId: number,
  userId: string,
): Promise<void> {
  await apiRequestFromClient(`/clubs/${clubId}/units/${unitId}/members`, {
    method: "POST",
    body: { user_id: userId },
  });
}

export async function removeUnitMember(
  clubId: number,
  unitId: number,
  memberId: number,
): Promise<void> {
  await apiRequestFromClient(
    `/clubs/${clubId}/units/${unitId}/members/${memberId}`,
    { method: "DELETE" },
  );
}

// ─── Weekly Records ───────────────────────────────────────────────────────────

export async function listWeeklyRecords(
  clubId: number,
  unitId: number,
): Promise<WeeklyRecord[]> {
  const payload = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/units/${unitId}/weekly-records`,
  );
  if (Array.isArray(payload)) return payload as WeeklyRecord[];
  const res = payload as { data?: unknown };
  if (Array.isArray(res.data)) return res.data as WeeklyRecord[];
  return [];
}

export async function createWeeklyRecord(
  clubId: number,
  unitId: number,
  payload: CreateWeeklyRecordPayload,
): Promise<WeeklyRecord> {
  const result = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/units/${unitId}/weekly-records`,
    { method: "POST", body: payload },
  );
  const res = result as { data?: unknown };
  if (res.data && typeof res.data === "object") return res.data as WeeklyRecord;
  return result as WeeklyRecord;
}

export async function updateWeeklyRecord(
  clubId: number,
  unitId: number,
  recordId: number,
  payload: UpdateWeeklyRecordPayload,
): Promise<WeeklyRecord> {
  const result = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/units/${unitId}/weekly-records/${recordId}`,
    { method: "PATCH", body: payload },
  );
  const res = result as { data?: unknown };
  if (res.data && typeof res.data === "object") return res.data as WeeklyRecord;
  return result as WeeklyRecord;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getUnitUserDisplayName(user?: UnitUser | null): string {
  if (!user) return "—";
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name]
    .filter(Boolean)
    .join(" ");
  return parts.trim() || user.user_id || "—";
}

export function getUnitLeaderName(unit: Unit): string {
  return getUnitUserDisplayName(unit.users_units_captain_idTousers);
}
