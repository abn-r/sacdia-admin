/**
 * Admin API client for the club section enrollment validation queue.
 * Backend: /club-enrollments (permission `club_enrollments:validate`).
 * The server filters every call by the reviewer's scope.
 */
import { ApiError, apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type ClubEnrollmentReviewStatus = "pending_validation" | "active" | "rejected";

export type ClubEnrollmentPerson = { user_id: string; name: string | null };

export type ClubEnrollmentBoard = {
  director: ClubEnrollmentPerson | null;
  deputies: ClubEnrollmentPerson[];
  secretary: ClubEnrollmentPerson | null;
  treasurer: ClubEnrollmentPerson | null;
  secretary_treasurer: ClubEnrollmentPerson | null;
};

export type ClubEnrollmentMeetingSlot = { day: string; time: string };

export type ClubEnrollmentItem = {
  enrollment_id: string;
  status: ClubEnrollmentReviewStatus;
  ecclesiastical_year: { id: number; name: string };
  club: { id: number; name: string };
  section: { id: number; club_type_id: number; club_type_name: string };
  local_field: { id: number; name: string };
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  meeting_days: string[] | string | null;
  meeting_schedule: ClubEnrollmentMeetingSlot[] | null;
  souls_target: number | null;
  fee: boolean;
  fee_amount: string | number | null;
  board: ClubEnrollmentBoard;
  submitted_by: ClubEnrollmentPerson | null;
  created_at: string;
  /** Set on first submit and on every resubmit. Null on legacy rows. */
  submitted_at: string | null;
  modified_at: string | null;
  reviewed_by: ClubEnrollmentPerson | null;
  reviewer_role: string | null;
  reviewed_at: string | null;
  decision_reason: string | null;
};

export type ClubEnrollmentCounts = {
  pending: number;
  approved: number;
  rejected: number;
};

export type ClubEnrollmentPage = {
  items: ClubEnrollmentItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    /** Whole scope, regardless of the status filter. */
    counts: ClubEnrollmentCounts;
  };
};

export type ClubEnrollmentListParams = {
  status?: ClubEnrollmentReviewStatus;
  search?: string;
  ecclesiasticalYearId?: number | null;
  localFieldId?: number | null;
  clubTypeId?: number | null;
  page?: number;
  limit?: number;
};

export const CLUB_ENROLLMENT_REASON_MIN = 5;
export const CLUB_ENROLLMENT_REASON_MAX = 500;

const BASE = "/club-enrollments";

export async function listClubEnrollmentQueue(
  params: ClubEnrollmentListParams = {},
): Promise<ClubEnrollmentPage> {
  const query: Record<string, string | number> = {};
  if (params.status) query.status = params.status;
  const search = params.search?.trim();
  if (search) query.search = search;
  if (params.ecclesiasticalYearId) query.ecclesiastical_year_id = params.ecclesiasticalYearId;
  if (params.localFieldId) query.local_field_id = params.localFieldId;
  if (params.clubTypeId) query.club_type_id = params.clubTypeId;
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  const payload = await apiRequest<unknown>(`${BASE}/validation/queue`, { params: query });
  return unwrapApiData<ClubEnrollmentPage>(payload);
}

export async function approveClubEnrollment(enrollmentId: string): Promise<ClubEnrollmentItem> {
  const payload = await apiRequest<unknown>(`${BASE}/${enrollmentId}/approve`, {
    method: "POST",
  });
  return unwrapApiData<ClubEnrollmentItem>(payload);
}

export async function rejectClubEnrollment(
  enrollmentId: string,
  reason: string,
): Promise<ClubEnrollmentItem> {
  const payload = await apiRequest<unknown>(`${BASE}/${enrollmentId}/reject`, {
    method: "POST",
    body: { reason: reason.trim() },
  });
  return unwrapApiData<ClubEnrollmentItem>(payload);
}

/** Backend error `code` of an ApiError (flat, `error.code` or `errors.code`). */
export function getClubEnrollmentErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }
  const payload = error.payload as {
    code?: unknown;
    error?: { code?: unknown };
    errors?: { code?: unknown };
  };
  if (typeof payload.code === "string") return payload.code;
  if (typeof payload.error?.code === "string") return payload.error.code;
  if (typeof payload.errors?.code === "string") return payload.errors.code;
  return null;
}
