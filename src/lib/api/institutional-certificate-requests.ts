import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Status ──────────────────────────────────────────────────────────────────

export type InstitutionalCertificateRequestStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

// ─── Event ───────────────────────────────────────────────────────────────────

export type InstitutionalCertificateRequestEvent = {
  event_id: string;
  action: string;
  comment?: string | null;
  revision: number;
  created_at: string;
};

// ─── Main entity ─────────────────────────────────────────────────────────────

export type InstitutionalCertificateRequest = {
  request_id: string;
  user_id: string;
  class_id: number;
  asset_code: string;
  class_name: string;
  /** file_id links to a batch file; use getCertificateBulkImportFileDownloadUrl to get the signed URL */
  file_id: string;
  /** batch_id may be included by the backend; needed to construct the download URL */
  batch_id?: string | null;
  status: InstitutionalCertificateRequestStatus;
  revision: number;
  /**
   * Certificate date (YYYY-MM-DD) — the date on the original document.
   * For GM-02/GM-03 this is informational; approval here is institutional
   * validation, not class registration.
   */
  completed_at: string;
  ecclesiastical_year_id?: string | null;
  decision_reason?: string | null;
  reviewed_at?: string | null;
  applicant_name: string;
  /**
   * Non-empty when approval is blocked by a system issue (e.g. missing period).
   * These are NOT the applicant's fault — do not reject the request because of them.
   */
  approval_blockers: string[];
  /**
   * Always false for GM-02/GM-03: approving here records institutional validation,
   * not a class enrollment.
   */
  enrollment_created: false;
  events?: InstitutionalCertificateRequestEvent[];
};

// ─── Paginated list ───────────────────────────────────────────────────────────

export type PaginatedInstitutionalCertificateRequests = {
  items: InstitutionalCertificateRequest[];
  total: number;
  page: number;
  limit: number;
};

// ─── Query params ─────────────────────────────────────────────────────────────

export type InstitutionalCertificateRequestsQuery = {
  page?: number;
  limit?: number;
  status?: InstitutionalCertificateRequestStatus | "all";
  class_id?: number;
  q?: string;
};

// ─── Action payloads ─────────────────────────────────────────────────────────

export type ApproveInstitutionalCertificateRequestPayload = {
  expected_revision: number;
  comment?: string;
};

export type RejectInstitutionalCertificateRequestPayload = {
  expected_revision: number;
  reason: string;
};

// ─── Envelope helpers ────────────────────────────────────────────────────────

type ApiEnvelope<T> = { status: string; data: T };

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload && "status" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

// ─── API functions ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/certificate-import-institutional-requests
 * Only super-admin.
 */
export async function listInstitutionalCertificateRequests(
  query: InstitutionalCertificateRequestsQuery = {},
): Promise<PaginatedInstitutionalCertificateRequests> {
  const params: Record<string, string | number | boolean | undefined> = {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  };
  if (query.status && query.status !== "all") params.status = query.status;
  if (query.class_id) params.class_id = query.class_id;
  if (query.q?.trim()) params.q = query.q.trim();

  const res = await apiRequest<ApiEnvelope<PaginatedInstitutionalCertificateRequests>>(
    "/admin/certificate-import-institutional-requests",
    { params },
  );
  return unwrap(res);
}

/**
 * GET /api/v1/admin/certificate-import-institutional-requests/:requestId
 */
export async function getInstitutionalCertificateRequestDetail(
  requestId: string,
): Promise<InstitutionalCertificateRequest> {
  const res = await apiRequest<ApiEnvelope<InstitutionalCertificateRequest>>(
    `/admin/certificate-import-institutional-requests/${requestId}`,
  );
  return unwrap(res);
}

/**
 * POST /api/v1/admin/certificate-import-institutional-requests/:requestId/approve
 * Approving means "institutional validation approved" — NOT "class registered".
 * enrollment_created is always false in the response.
 */
export async function approveInstitutionalCertificateRequest(
  requestId: string,
  payload: ApproveInstitutionalCertificateRequestPayload,
): Promise<InstitutionalCertificateRequest> {
  const res = await apiRequestFromClient<ApiEnvelope<InstitutionalCertificateRequest>>(
    `/admin/certificate-import-institutional-requests/${requestId}/approve`,
    { method: "POST", body: payload },
  );
  return unwrap(res);
}

/**
 * POST /api/v1/admin/certificate-import-institutional-requests/:requestId/reject
 */
export async function rejectInstitutionalCertificateRequest(
  requestId: string,
  payload: RejectInstitutionalCertificateRequestPayload,
): Promise<InstitutionalCertificateRequest> {
  const res = await apiRequestFromClient<ApiEnvelope<InstitutionalCertificateRequest>>(
    `/admin/certificate-import-institutional-requests/${requestId}/reject`,
    { method: "POST", body: payload },
  );
  return unwrap(res);
}
