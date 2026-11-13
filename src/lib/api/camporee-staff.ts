/**
 * Camporee staff roster + per-event staff assignments (API client).
 *
 * Backend: `camporee-staff.controller.ts` and the `staff-assignments` routes in
 * `camporee-events.controller.ts`.
 *   - Read: `camporee_events:read`.
 *   - Manage (candidates, add, edit, deactivate, replace assignments):
 *     `camporee_events:update`.
 * `GET .../staff` only returns active members; deactivating removes the member
 * from the roster and also deactivates their event assignments.
 */

import { ApiError, apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

// ─── Types ─────────────────────────────────────────────────────────────────────

export const CAMPOREE_STAFF_CATEGORIES = [
  "judge",
  "administrative",
  "kitchen",
  "support",
  "spiritual",
  "leadership",
  "other",
] as const;

export type CamporeeStaffCategory = (typeof CAMPOREE_STAFF_CATEGORIES)[number];

export const CAMPOREE_EVENT_ASSIGNMENT_FUNCTIONS = [
  "responsible",
  "assistant",
  "evaluator",
  "support",
] as const;

export type CamporeeEventAssignmentRole =
  (typeof CAMPOREE_EVENT_ASSIGNMENT_FUNCTIONS)[number];

export type CamporeeStaffKind = "local" | "union";

export type CamporeeStaffUserSummary = {
  user_id: string;
  email: string | null;
  name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  full_name: string;
  user_image: string | null;
  active?: boolean;
  access_app?: boolean;
  access_panel?: boolean;
  union?: { union_id: number; name: string } | null;
  local_field?: {
    local_field_id: number;
    union_id: number | null;
    name: string;
  } | null;
};

export type CamporeeStaffMember = {
  camporee_staff_member_id: string;
  local_camporee_id: number | null;
  union_camporee_id: number | null;
  user_id: string;
  category: CamporeeStaffCategory;
  role_label: string | null;
  notes: string | null;
  status: string;
  active: boolean;
  user: CamporeeStaffUserSummary | null;
};

export type CamporeeStaffCandidate = CamporeeStaffUserSummary & {
  already_staff_member_id: string | null;
};

export type AddCamporeeStaffMemberPayload = {
  user_id: string;
  category: CamporeeStaffCategory;
  role_label?: string;
  notes?: string;
};

export type UpdateCamporeeStaffMemberPayload = {
  category?: CamporeeStaffCategory;
  role_label?: string | null;
  notes?: string | null;
  status?: "active" | "inactive";
  active?: boolean;
};

export type CamporeeEventStaffAssignment = {
  camporee_event_staff_assignment_id: string;
  camporee_event_id: number;
  camporee_staff_member_id: string;
  assignment_role: CamporeeEventAssignmentRole;
  title_override: string | null;
  notes: string | null;
  display_order: number;
  active: boolean;
  staff_member?: {
    camporee_staff_member_id: string;
    category: CamporeeStaffCategory;
    role_label: string | null;
    user_id: string;
    user: CamporeeStaffUserSummary | null;
  } | null;
};

export type CamporeeEventStaffAssignmentInput = {
  camporee_staff_member_id: string;
  assignment_role: CamporeeEventAssignmentRole;
  title_override?: string;
  display_order?: number;
  notes?: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function basePath(kind: CamporeeStaffKind, camporeeId: number): string {
  return `/${kind === "union" ? "union" : "local"}-camporees/${camporeeId}`;
}

/** Display name of a roster member (falls back to the user id). */
export function getCamporeeStaffDisplayName(
  member: Pick<CamporeeStaffMember, "user" | "user_id">,
): string {
  return member.user?.full_name?.trim() || member.user?.email || member.user_id;
}

/** Machine code of a failed staff/event request (`payload.code`). */
export function getCamporeeStaffErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }
  const root = error.payload as { code?: unknown; error?: { code?: unknown } };
  if (typeof root.code === "string" && root.code.trim()) return root.code;
  const nested = root.error?.code;
  return typeof nested === "string" && nested.trim() ? nested : null;
}

// ─── Roster ────────────────────────────────────────────────────────────────────

export async function listCamporeeStaff(
  kind: CamporeeStaffKind,
  camporeeId: number,
): Promise<CamporeeStaffMember[]> {
  const payload = await apiRequest<unknown>(`${basePath(kind, camporeeId)}/staff`);
  const data = unwrapApiData<CamporeeStaffMember[] | null>(payload);
  return Array.isArray(data) ? data : [];
}

export async function listCamporeeStaffCandidates(
  kind: CamporeeStaffKind,
  camporeeId: number,
): Promise<CamporeeStaffCandidate[]> {
  const payload = await apiRequest<unknown>(
    `${basePath(kind, camporeeId)}/staff-candidates`,
  );
  const data = unwrapApiData<CamporeeStaffCandidate[] | null>(payload);
  return Array.isArray(data) ? data : [];
}

export async function addCamporeeStaffMember(
  kind: CamporeeStaffKind,
  camporeeId: number,
  body: AddCamporeeStaffMemberPayload,
): Promise<CamporeeStaffMember> {
  const payload = await apiRequest<unknown>(`${basePath(kind, camporeeId)}/staff`, {
    method: "POST",
    body,
  });
  return unwrapApiData<CamporeeStaffMember>(payload);
}

export async function updateCamporeeStaffMember(
  staffMemberId: string,
  body: UpdateCamporeeStaffMemberPayload,
): Promise<CamporeeStaffMember> {
  const payload = await apiRequest<unknown>(`/camporee-staff/${staffMemberId}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<CamporeeStaffMember>(payload);
}

export async function deactivateCamporeeStaffMember(
  staffMemberId: string,
): Promise<CamporeeStaffMember> {
  const payload = await apiRequest<unknown>(`/camporee-staff/${staffMemberId}`, {
    method: "DELETE",
  });
  return unwrapApiData<CamporeeStaffMember>(payload);
}

// ─── Event staff assignments ───────────────────────────────────────────────────

export async function listCamporeeEventStaffAssignments(
  eventId: number,
): Promise<CamporeeEventStaffAssignment[]> {
  const payload = await apiRequest<unknown>(
    `/camporee-events/${eventId}/staff-assignments`,
  );
  const data = unwrapApiData<CamporeeEventStaffAssignment[] | null>(payload);
  return Array.isArray(data) ? data : [];
}

/** Replaces ALL active assignments of the event (PUT semantics). */
export async function replaceCamporeeEventStaffAssignments(
  eventId: number,
  assignments: CamporeeEventStaffAssignmentInput[],
): Promise<CamporeeEventStaffAssignment[]> {
  const payload = await apiRequest<unknown>(
    `/camporee-events/${eventId}/staff-assignments`,
    { method: "PUT", body: { assignments } },
  );
  const data = unwrapApiData<CamporeeEventStaffAssignment[] | null>(payload);
  return Array.isArray(data) ? data : [];
}
