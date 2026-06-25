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

type ApiUser = {
  user_id?: string;
  first_name?: string | null;
  name?: string | null;
  last_name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  email?: string | null;
  photo?: string | null;
  user_image?: string | null;
};

type ApiSection = {
  section_id?: number;
  club_section_id?: number;
  name?: string | null;
  club_type?: { name?: string | null } | null;
  club_types?: { name?: string | null } | null;
  clubs?: { name?: string | null } | null;
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
  sectionId?: number;
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

type RawTransferRequest = {
  id?: number | string;
  transfer_request_id?: number | string;
  request_id?: number | string;
  status?: unknown;
  reason?: string | null;
  comment?: string | null;
  review_comment?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
  requester?: ApiUser | null;
  user?: ApiUser | null;
  from_section?: ApiSection | null;
  to_section?: ApiSection | null;
};

function normalizeStatus(status: unknown): RequestStatus {
  const normalized = String(status ?? "pending").toUpperCase();
  if (
    normalized === "PENDING" ||
    normalized === "APPROVED" ||
    normalized === "REJECTED"
  ) {
    return normalized;
  }
  return "PENDING";
}

function getSectionName(section: ApiSection): string {
  return (
    section?.name ??
    section?.club_types?.name ??
    section?.club_type?.name ??
    section?.clubs?.name ??
    "—"
  );
}

function normalizeTransferRequest(raw: RawTransferRequest): TransferRequest {
  const requester = raw.requester ?? raw.user ?? null;
  const fromSection = raw.from_section ?? null;
  const toSection = raw.to_section ?? null;
  const derivedLastName = requester
    ? [requester.paternal_last_name, requester.maternal_last_name]
        .filter(Boolean)
        .join(" ")
    : "";
  const lastName = requester
    ? requester.last_name ?? (derivedLastName.length > 0 ? derivedLastName : null)
    : null;

  return {
    request_id: raw.transfer_request_id ?? raw.request_id ?? raw.id ?? "",
    status: normalizeStatus(raw.status),
    reason: raw.reason ?? null,
    comment: raw.review_comment ?? raw.comment ?? null,
    created_at: raw.created_at ?? "",
    reviewed_at: raw.reviewed_at ?? null,
    requester: requester
      ? {
          user_id: requester.user_id ?? "",
          first_name: requester.first_name ?? requester.name ?? null,
          last_name: lastName,
          email: requester.email ?? null,
          photo: requester.photo ?? requester.user_image ?? null,
        }
      : null,
    from_section: fromSection
      ? {
          section_id:
            fromSection.section_id ?? fromSection.club_section_id ?? 0,
          name: getSectionName(fromSection),
        }
      : null,
    to_section: toSection
      ? {
          section_id: toSection.section_id ?? toSection.club_section_id ?? 0,
          name: getSectionName(toSection),
        }
      : null,
  };
}

// ─── Transfer API functions ───────────────────────────────────────────────────

/**
 * GET /api/v1/requests/transfers?status=&sectionId=
 * List transfer requests optionally filtered by status and section.
 */
export async function getTransferRequests(
  query: RequestsQuery = {},
): Promise<TransferRequest[]> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.status) params.status = query.status.toLowerCase();
  const sectionId = query.sectionId ?? query.section_id;
  if (sectionId) params.sectionId = sectionId;

  const res = await apiRequest<unknown>("/requests/transfers", { params });
  return extractList<RawTransferRequest>(res).map(normalizeTransferRequest);
}

/**
 * GET /api/v1/requests/transfers/:requestId
 * Transfer request detail.
 */
export async function getTransferRequestDetail(
  requestId: number | string,
): Promise<TransferRequestDetail> {
  const res = await apiRequest<RawTransferRequest | { data: RawTransferRequest }>(
    `/requests/transfers/${requestId}`,
  );
  if (res && typeof res === "object" && "data" in res) {
    return normalizeTransferRequest(
      (res as { data: RawTransferRequest }).data,
    ) as TransferRequestDetail;
  }
  return normalizeTransferRequest(res) as TransferRequestDetail;
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
