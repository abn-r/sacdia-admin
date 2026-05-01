import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ValidationEntityType = "class" | "honor";

export type ValidationAction = "APPROVED" | "REJECTED";

export type ValidationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_REVISION";

// ─── Shared sub-types ─────────────────────────────────────────────────────────

export type ValidationUser = {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  photo?: string | null;
};

export type ValidationEntity = {
  id: number | string;
  name: string;
};

export type ValidationSection = {
  section_id: number;
  name: string;
};

// ─── Main types ───────────────────────────────────────────────────────────────

export type PendingValidation = {
  validation_id: number | string;
  entity_type: ValidationEntityType;
  entity_id: number | string;
  status: ValidationStatus;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  comment?: string | null;
  user?: ValidationUser | null;
  entity?: ValidationEntity | null;
  section?: ValidationSection | null;
};

export type ValidationHistoryEntry = {
  history_id: number | string;
  action: ValidationAction | string;
  performed_by?: string | null;
  comment?: string | null;
  created_at: string;
  performer?: ValidationUser | null;
};

export type EligibilityResult = {
  user_id: string;
  eligible: boolean;
  reasons?: string[];
};

// ─── Query types ──────────────────────────────────────────────────────────────

export type PendingValidationQuery = {
  section_id?: number;
  entity_type?: ValidationEntityType;
  page?: number;
  limit?: number;
};

// ─── Request payloads ─────────────────────────────────────────────────────────

export type SubmitValidationPayload = {
  entity_type: ValidationEntityType;
  entity_id: number | string;
  section_id?: number;
  comment?: string;
};

export type ReviewValidationPayload = {
  action: ValidationAction;
  comment?: string;
};

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/validation/pending?section_id=&entity_type=
 * List all pending validations optionally filtered by section and entity type.
 */
export async function getPendingValidations(
  query: PendingValidationQuery = {},
): Promise<PendingValidation[]> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.section_id) params.section_id = query.section_id;
  if (query.entity_type) params.entity_type = query.entity_type;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  const res = await apiRequest<
    PendingValidation[] | { data: PendingValidation[] } | { status: string; data: PendingValidation[] }
  >("/validation/pending", { params });

  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown }).data)) {
    return (res as { data: PendingValidation[] }).data;
  }
  return [];
}

/**
 * GET /api/v1/validation/:entityType/:entityId/history
 * Validation history for a specific entity.
 */
export async function getValidationHistory(
  entityType: ValidationEntityType,
  entityId: number | string,
): Promise<ValidationHistoryEntry[]> {
  const res = await apiRequest<
    ValidationHistoryEntry[] | { data: ValidationHistoryEntry[] }
  >(`/validation/${entityType}/${entityId}/history`);

  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && "data" in res && Array.isArray((res as { data: unknown }).data)) {
    return (res as { data: ValidationHistoryEntry[] }).data;
  }
  return [];
}

/**
 * GET /api/v1/validation/eligibility/:userId
 * Check eligibility of a user for validation.
 */
export async function getValidationEligibility(
  userId: string,
): Promise<EligibilityResult> {
  const res = await apiRequest<EligibilityResult | { data: EligibilityResult }>(
    `/validation/eligibility/${userId}`,
  );
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: EligibilityResult }).data;
  }
  return res as EligibilityResult;
}

/**
 * POST /api/v1/validation/submit
 * Submit a class or honor for review.
 * Client-side only (mutation).
 */
export async function submitValidation(
  payload: SubmitValidationPayload,
): Promise<unknown> {
  return apiRequestFromClient<unknown>("/validation/submit", {
    method: "POST",
    body: payload,
  });
}

/**
 * POST /api/v1/validation/:entityType/:entityId/review
 * Approve or reject a pending validation.
 * Client-side only (mutation).
 */
export async function reviewValidation(
  entityType: ValidationEntityType,
  entityId: number | string,
  payload: ReviewValidationPayload,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/validation/${entityType}/${entityId}/review`,
    { method: "POST", body: payload },
  );
}
