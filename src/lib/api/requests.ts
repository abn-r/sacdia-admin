import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ReviewAction = "approved" | "rejected";

// ─── Shared sub-types ─────────────────────────────────────────────────────────

export type RequestUser = {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  photo?: string | null;
};

export type RequestSection = {
  section_id: number;
  name: string;
};

// ─── Transfer request types ───────────────────────────────────────────────────

export type TransferRequest = {
  request_id: number | string;
  status: RequestStatus;
  reason?: string | null;
  comment?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  requester?: RequestUser | null;
  from_section?: RequestSection | null;
  to_section?: RequestSection | null;
};

export type TransferRequestDetail = TransferRequest & {
  reviewed_by?: RequestUser | null;
};

// ─── Assignment request types ─────────────────────────────────────────────────

export type AssignmentRequest = {
  request_id: number | string;
  status: RequestStatus;
  role_to_assign?: string | null;
  comment?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  target_user?: RequestUser | null;
  section?: RequestSection | null;
  requested_by?: RequestUser | null;
};

export type AssignmentRequestDetail = AssignmentRequest & {
  reviewed_by?: RequestUser | null;
};

// ─── Query types ──────────────────────────────────────────────────────────────

export type RequestsQuery = {
  status?: RequestStatus;
  section_id?: number;
};

// ─── Request payloads ─────────────────────────────────────────────────────────

export type ReviewRequestPayload = {
  action: ReviewAction;
  comment?: string;
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

// ─── Transfer API functions ───────────────────────────────────────────────────

/**
 * GET /api/v1/requests/transfers?status=&section_id=
 * List transfer requests optionally filtered by status and section.
 */
export async function getTransferRequests(
  query: RequestsQuery = {},
): Promise<TransferRequest[]> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.status) params.status = query.status;
  if (query.section_id) params.section_id = query.section_id;

  const res = await apiRequest<unknown>("/requests/transfers", { params });
  return extractList<TransferRequest>(res);
}

/**
 * GET /api/v1/requests/transfers/:requestId
 * Transfer request detail.
 */
export async function getTransferRequestDetail(
  requestId: number | string,
): Promise<TransferRequestDetail> {
  const res = await apiRequest<TransferRequestDetail | { data: TransferRequestDetail }>(
    `/requests/transfers/${requestId}`,
  );
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: TransferRequestDetail }).data;
  }
  return res as TransferRequestDetail;
}

/**
 * POST /api/v1/requests/transfers/:requestId/review
 * Approve or reject a transfer request.
 * Client-side only (mutation).
 */
export async function reviewTransferRequest(
  requestId: number | string,
  payload: ReviewRequestPayload,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/requests/transfers/${requestId}/review`,
    { method: "POST", body: payload },
  );
}

// ─── Assignment API functions ─────────────────────────────────────────────────

/**
 * GET /api/v1/requests/assignments?status=&section_id=
 * List role assignment requests optionally filtered by status and section.
 */
export async function getAssignmentRequests(
  query: RequestsQuery = {},
): Promise<AssignmentRequest[]> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.status) params.status = query.status;
  if (query.section_id) params.section_id = query.section_id;

  const res = await apiRequest<unknown>("/requests/assignments", { params });
  return extractList<AssignmentRequest>(res);
}

/**
 * GET /api/v1/requests/assignments/:requestId
 * Assignment request detail.
 */
export async function getAssignmentRequestDetail(
  requestId: number | string,
): Promise<AssignmentRequestDetail> {
  const res = await apiRequest<AssignmentRequestDetail | { data: AssignmentRequestDetail }>(
    `/requests/assignments/${requestId}`,
  );
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: AssignmentRequestDetail }).data;
  }
  return res as AssignmentRequestDetail;
}

/**
 * POST /api/v1/requests/assignments/:requestId/review
 * Approve or reject a role assignment request.
 * Client-side only (mutation).
 */
export async function reviewAssignmentRequest(
  requestId: number | string,
  payload: ReviewRequestPayload,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/requests/assignments/${requestId}/review`,
    { method: "POST", body: payload },
  );
}
