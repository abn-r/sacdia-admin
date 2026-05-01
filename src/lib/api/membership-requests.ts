import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MembershipRequestUser = {
  user_id: string;
  name?: string | null;
  email?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  user_image?: string | null;
};

export type MembershipRequestRole = {
  role_id: string;
  role_name?: string | null;
};

export type MembershipRequest = {
  assignment_id: string;
  club_section_id: number;
  role_id?: string | null;
  status: string;
  created_at: string;
  expires_at?: string | null;
  rejection_reason?: string | null;
  users?: MembershipRequestUser | null;
  roles?: MembershipRequestRole | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/club-sections/:clubSectionId/membership-requests
 * List pending membership requests for a club section.
 * Server-side (SSR) — reads token from cookies.
 * Requires `club_members:approve` permission.
 */
export async function listMembershipRequests(
  clubSectionId: number,
): Promise<MembershipRequest[]> {
  const res = await apiRequest<unknown>(
    `/club-sections/${clubSectionId}/membership-requests`,
  );
  return extractList<MembershipRequest>(res);
}

/**
 * GET /api/v1/club-sections/:clubSectionId/membership-requests
 * List pending membership requests for a club section.
 * Client-side — uses axios interceptor to attach Bearer token.
 */
export async function listMembershipRequestsFromClient(
  clubSectionId: number,
): Promise<MembershipRequest[]> {
  const res = await apiRequestFromClient<unknown>(
    `/club-sections/${clubSectionId}/membership-requests`,
  );
  return extractList<MembershipRequest>(res);
}

/**
 * POST /api/v1/club-sections/:clubSectionId/membership-requests/:assignmentId/approve
 * Approve a pending membership request.
 * Client-side only (mutation).
 */
export async function approveMembershipRequest(
  clubSectionId: number,
  assignmentId: string,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/club-sections/${clubSectionId}/membership-requests/${assignmentId}/approve`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/club-sections/:clubSectionId/membership-requests/:assignmentId/reject
 * Reject a pending membership request with optional reason.
 * Client-side only (mutation).
 */
export async function rejectMembershipRequest(
  clubSectionId: number,
  assignmentId: string,
  reason?: string,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/club-sections/${clubSectionId}/membership-requests/${assignmentId}/reject`,
    { method: "POST", body: { reason: reason ?? undefined } },
  );
}
