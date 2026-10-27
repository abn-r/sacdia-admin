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

function extractItem(payload: unknown): unknown {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data;
  }
  return payload;
}

// ─── Backend contract ─────────────────────────────────────────────────────────
//
// `RequestsService` returns Prisma rows with their includes: lowercase status,
// `transfer_request_id`, users as `{ name, paternal_last_name }` and sections
// as `{ club_section_id, clubs.name, club_types.name }`. The screens use the
// shapes above, so every read goes through these mappers.

type ApiUser = {
  user_id: string;
  name?: string | null;
  paternal_last_name?: string | null;
  email?: string | null;
} | null;

type ApiSection = {
  club_section_id: number;
  clubs?: { name?: string | null } | null;
  club_types?: { name?: string | null } | null;
} | null;

type ApiTransferRequest = {
  transfer_request_id: string;
  status: string;
  reason?: string | null;
  review_comment?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  user?: ApiUser;
  from_section?: ApiSection;
  to_section?: ApiSection;
  reviewer?: ApiUser;
};

type ApiAssignmentRequest = {
  request_id: string;
  status: string;
  comment?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  user?: ApiUser;
  role?: { role_name?: string | null } | null;
  requester?: ApiUser;
  approver?: ApiUser;
  club_section?: ApiSection;
};

function toStatus(status: string): RequestStatus {
  return status.toUpperCase() as RequestStatus;
}

function toUser(user: ApiUser | undefined): RequestUser | null {
  if (!user) return null;
  return {
    user_id: user.user_id,
    first_name: user.name ?? null,
    last_name: user.paternal_last_name ?? null,
    email: user.email ?? null,
  };
}

function toSection(section: ApiSection | undefined): RequestSection | null {
  if (!section) return null;
  const name = [section.clubs?.name, section.club_types?.name]
    .filter(Boolean)
    .join(" · ");
  return { section_id: section.club_section_id, name };
}

function toTransferRequest(row: ApiTransferRequest): TransferRequestDetail {
  return {
    request_id: row.transfer_request_id,
    status: toStatus(row.status),
    reason: row.reason ?? null,
    comment: row.review_comment ?? null,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at ?? null,
    requester: toUser(row.user),
    from_section: toSection(row.from_section),
    to_section: toSection(row.to_section),
    reviewed_by: toUser(row.reviewer),
  };
}

function toAssignmentRequest(row: ApiAssignmentRequest): AssignmentRequestDetail {
  return {
    request_id: row.request_id,
    status: toStatus(row.status),
    role_to_assign: row.role?.role_name ?? null,
    comment: row.comment ?? null,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at ?? null,
    target_user: toUser(row.user),
    section: toSection(row.club_section),
    requested_by: toUser(row.requester),
    reviewed_by: toUser(row.approver),
  };
}

function toQueryParams(query: RequestsQuery) {
  const params: Record<string, string | number | boolean | undefined> = {};
  // The API filters by lowercase status and reads `sectionId`.
  if (query.status) params.status = query.status.toLowerCase();
  if (query.section_id) params.sectionId = query.section_id;
  return params;
}

// ─── Transfer API functions ───────────────────────────────────────────────────

/**
 * GET /api/v1/requests/transfers?status=&sectionId=
 * List transfer requests optionally filtered by status and section.
 */
export async function getTransferRequests(
  query: RequestsQuery = {},
): Promise<TransferRequest[]> {
  const res = await apiRequest<unknown>("/requests/transfers", {
    params: toQueryParams(query),
  });
  return extractList<ApiTransferRequest>(res).map(toTransferRequest);
}

/**
 * GET /api/v1/requests/transfers/:requestId
 * Transfer request detail.
 */
export async function getTransferRequestDetail(
  requestId: number | string,
): Promise<TransferRequestDetail> {
  const res = await apiRequest<unknown>(`/requests/transfers/${requestId}`);
  return toTransferRequest(extractItem(res) as ApiTransferRequest);
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
 * GET /api/v1/requests/assignments?status=&sectionId=
 * List role assignment requests optionally filtered by status and section.
 */
export async function getAssignmentRequests(
  query: RequestsQuery = {},
): Promise<AssignmentRequest[]> {
  const res = await apiRequest<unknown>("/requests/assignments", {
    params: toQueryParams(query),
  });
  return extractList<ApiAssignmentRequest>(res).map(toAssignmentRequest);
}

/**
 * GET /api/v1/requests/assignments/:requestId
 * Assignment request detail.
 */
export async function getAssignmentRequestDetail(
  requestId: number | string,
): Promise<AssignmentRequestDetail> {
  const res = await apiRequest<unknown>(`/requests/assignments/${requestId}`);
  return toAssignmentRequest(extractItem(res) as ApiAssignmentRequest);
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
