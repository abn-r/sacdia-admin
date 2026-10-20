import { ApiError, apiRequest, apiRequestFromClient } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

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

export type MembershipConsentStatus = "pending" | "verified";

export type MembershipConsentGuardian = {
  display_name: string;
  relationship_type_name: string | null;
  is_primary: boolean;
};

/**
 * Consent block of a pending request. `null` (or absent) for adults.
 * Present for every minor (by age, not only those with a dependent profile),
 * including teens and minors registered by a director.
 */
export type MembershipRequestConsent = {
  required: true;
  /**
   * false for a self-registered teen who has no dependent profile yet (nobody
   * linked, so there is nothing to verify).
   */
  dependent: boolean;
  /**
   * A non-custodian guardian (pending or verified) is linked. A minor
   * registered by a director is under club custody and has none until a parent
   * claims them.
   */
  guardian_linked?: boolean;
  /** The row verify-consent acts on; null when there is none yet. */
  guardianship_id: string | null;
  status: MembershipConsentStatus;
  evidence_uploaded: boolean;
  guardians: MembershipConsentGuardian[];
};

export type MembershipRequest = {
  assignment_id: string;
  club_section_id: number;
  role_id?: string | null;
  status: string;
  created_at: string;
  /** Base timeout of the request. */
  expires_at?: string | null;
  /**
   * Computed by the backend: when the request really lapses. For minors with
   * pending consent the window is longer (30 days) than the base `expires_at`.
   * Display `effective_expires_at ?? expires_at`.
   */
  effective_expires_at?: string | null;
  rejection_reason?: string | null;
  users?: MembershipRequestUser | null;
  roles?: MembershipRequestRole | null;
  consent?: MembershipRequestConsent | null;
};

export type ConsentEvidenceUploadResult = {
  evidence_id: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
};

export type ConsentEvidence = {
  /** Signed, short-lived URL (never public). */
  url: string;
  expires_in: number;
  content_type: string;
  uploaded_at: string;
  uploaded_by_display_name?: string | null;
};

export type VerifyConsentResult = {
  guardianship: {
    guardianship_id: string;
    consent_status: string;
    verified_at: string | null;
    verified_by_user_id: string | null;
    verification_method: string | null;
  };
  /** Approved assignment, or null when `approve` was false or approving failed. */
  assignment: unknown | null;
  /** Error code when `approve` was requested but failed after the commit. */
  approve_error: string | null;
};

export type VerifyConsentInput = {
  confirm_paper_form_reviewed: true;
  approve?: boolean;
};

/** Accepted evidence MIME types (backend validates magic bytes; HEIC is rejected). */
export const CONSENT_EVIDENCE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const CONSENT_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

/** Error codes the consent flow knows how to explain (i18n: membership.consent.errors.*). */
export const CONSENT_ERROR_CODES = [
  "GUARDIANSHIP_EVIDENCE_NOT_FOUND",
  "GUARDIANSHIP_EVIDENCE_REQUIRED",
  "GUARDIANSHIP_EVIDENCE_UNAVAILABLE",
  "GUARDIANSHIP_CUSTODIAN_SELF_VERIFY",
  "GUARDIANSHIP_GUARDIAN_SELF_VERIFY",
  "GUARDIANSHIP_CONSENT_ALREADY_VERIFIED",
  "GUARDIANSHIP_NOT_FOUND",
  "MR_CONSENT_CONFIRMATION_REQUIRED",
  "MR_CONSENT_NOT_VERIFIED",
  "MR_APPROVE_PERMISSION_REQUIRED",
  "MR_NOT_FOUND",
  "MR_ALREADY_PENDING",
  "FILE_REQUIRED",
  "FILE_TYPE_INVALID",
  "FILE_TOO_LARGE",
  "GUARD_PERMISSION_DENIED",
] as const;

export type ConsentErrorCode = (typeof CONSENT_ERROR_CODES)[number];

/**
 * Reads the machine error code from a failed request. Only the top-level
 * `code` is used: the backend drops `details` in production, so clients
 * must never depend on it.
 *
 * Exception: a body rejected by the multipart parser (multer) answers HTTP 413
 * with no `code` of ours. Any failure with status 413 and no recognised code is
 * a size problem, so it maps to FILE_TOO_LARGE.
 */
export function getConsentErrorCode(error: unknown): ConsentErrorCode | null {
  const code = readErrorCode(error);
  if (code && (CONSENT_ERROR_CODES as readonly string[]).includes(code)) {
    return code as ConsentErrorCode;
  }
  if (error instanceof ApiError && error.status === 413) {
    return "FILE_TOO_LARGE";
  }
  return null;
}

/** Narrows an arbitrary string (e.g. `approve_error`) to a known consent code. */
export function toConsentErrorCode(value: string | null | undefined): ConsentErrorCode | null {
  return value && (CONSENT_ERROR_CODES as readonly string[]).includes(value)
    ? (value as ConsentErrorCode)
    : null;
}

function readErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }
  const code = (error.payload as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code : null;
}

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

// ─── Consent (minors) ─────────────────────────────────────────────────────────

function consentBase(clubSectionId: number, assignmentId: string) {
  return `/club-sections/${clubSectionId}/membership-requests/${assignmentId}`;
}

/**
 * POST .../:assignmentId/consent-evidence (multipart `file`)
 * Uploads (or replaces) the signed paper form of a minor's request.
 * jpeg/png/webp/pdf, max 10 MB. A re-upload supersedes the previous one.
 */
export async function uploadConsentEvidence(
  clubSectionId: number,
  assignmentId: string,
  file: File | Blob,
): Promise<ConsentEvidenceUploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiRequestFromClient<unknown>(
    `${consentBase(clubSectionId, assignmentId)}/consent-evidence`,
    { method: "POST", body: form },
  );
  return unwrapApiData<ConsentEvidenceUploadResult>(res);
}

/**
 * GET .../:assignmentId/consent-evidence
 * Returns a signed URL (TTL 900 s) for the current evidence.
 */
export async function getConsentEvidence(
  clubSectionId: number,
  assignmentId: string,
): Promise<ConsentEvidence> {
  const res = await apiRequestFromClient<unknown>(
    `${consentBase(clubSectionId, assignmentId)}/consent-evidence`,
  );
  return unwrapApiData<ConsentEvidence>(res);
}

/**
 * POST .../:assignmentId/verify-consent
 * Marks the guardian consent as verified and, optionally, approves the request.
 * Idempotent. When approving fails after the commit the response is still 200
 * with `approve_error` set; retrying only retries the approval.
 */
export async function verifyConsent(
  clubSectionId: number,
  assignmentId: string,
  input: VerifyConsentInput,
): Promise<VerifyConsentResult> {
  const res = await apiRequestFromClient<unknown>(
    `${consentBase(clubSectionId, assignmentId)}/verify-consent`,
    { method: "POST", body: input },
  );
  const data = unwrapApiData<Partial<VerifyConsentResult>>(res);
  return {
    guardianship: data.guardianship as VerifyConsentResult["guardianship"],
    assignment: data.assignment ?? null,
    approve_error: data.approve_error ?? null,
  };
}
