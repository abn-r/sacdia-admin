/**
 * Admin API client for the counselor «constancia» review queue.
 * Backend: /service-credentials/review (permission `service_credentials:review`).
 * The server filters every call by the reviewer's scope; an out-of-scope id
 * answers 404.
 */
import { ApiError, apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type ServiceCredentialReviewStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type ServiceCredentialReviewItem = {
  credential_id: string;
  user: { user_id: string; name: string | null; photo_url: string | null };
  club_name: string | null;
  type: "COUNSELOR_TRAINING";
  /** Calendar date, YYYY-MM-DD. */
  completed_at: string;
  status: ServiceCredentialReviewStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewer_role: string | null;
};

export type ServiceCredentialReviewCounts = {
  pending: number;
  approved: number;
  rejected: number;
};

export type ServiceCredentialReviewPage = {
  items: ServiceCredentialReviewItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    /** Whole scope, regardless of the status filter. */
    counts: ServiceCredentialReviewCounts;
  };
};

export type ServiceCredentialReviewDetail = ServiceCredentialReviewItem & {
  /** Signed URL, valid 900 s: refetch the detail when reopening. */
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  decision_reason: string | null;
  expires_at: string | null;
};

export type ServiceCredentialReviewListParams = {
  status?: ServiceCredentialReviewStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export const SERVICE_CREDENTIAL_REASON_MIN = 5;
export const SERVICE_CREDENTIAL_REASON_MAX = 500;

const BASE = "/service-credentials/review";

export async function listServiceCredentialReviews(
  params: ServiceCredentialReviewListParams = {},
): Promise<ServiceCredentialReviewPage> {
  const query: Record<string, string | number> = {};
  if (params.status) query.status = params.status;
  const search = params.search?.trim();
  if (search) query.search = search;
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  const payload = await apiRequest<unknown>(BASE, { params: query });
  return unwrapApiData<ServiceCredentialReviewPage>(payload);
}

export async function getServiceCredentialReview(
  credentialId: string,
): Promise<ServiceCredentialReviewDetail> {
  const payload = await apiRequest<unknown>(`${BASE}/${credentialId}`);
  return unwrapApiData<ServiceCredentialReviewDetail>(payload);
}

export async function approveServiceCredential(
  credentialId: string,
  input: { expires_at?: string } = {},
): Promise<ServiceCredentialReviewDetail> {
  const body: { expires_at?: string } = {};
  if (input.expires_at) body.expires_at = input.expires_at;
  const payload = await apiRequest<unknown>(`${BASE}/${credentialId}/approve`, {
    method: "POST",
    body,
  });
  return unwrapApiData<ServiceCredentialReviewDetail>(payload);
}

export async function rejectServiceCredential(
  credentialId: string,
  reason: string,
): Promise<ServiceCredentialReviewDetail> {
  const payload = await apiRequest<unknown>(`${BASE}/${credentialId}/reject`, {
    method: "POST",
    body: { reason: reason.trim() },
  });
  return unwrapApiData<ServiceCredentialReviewDetail>(payload);
}

/** Backend error `code` of an ApiError (flat, `error.code` or `errors.code`). */
export function getServiceCredentialErrorCode(error: unknown): string | null {
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
