import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type InvestitureStatus =
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_VALIDATION"
  | "APPROVED"
  | "REJECTED"
  | "INVESTIDO";

export type InvestitureAction =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "REINVESTITURE_REQUESTED";

export type ValidateAction = "APPROVED" | "REJECTED";

// ─── Shared sub-types ─────────────────────────────────────────────────────────

export type InvestitureUser = {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  photo?: string | null;
};

export type InvestitureClass = {
  class_id: number;
  name: string;
};

export type InvestitureClub = {
  club_id: number;
  name: string;
};

export type EcclesiasticalYear = {
  ecclesiastical_year_id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
};

// ─── Main types ───────────────────────────────────────────────────────────────

export type PendingEnrollment = {
  enrollment_id: number;
  investiture_status: InvestitureStatus;
  submitted_at?: string | null;
  validated_at?: string | null;
  rejection_reason?: string | null;
  locked_for_validation?: boolean;
  user?: InvestitureUser | null;
  class?: InvestitureClass | null;
  club?: InvestitureClub | null;
  ecclesiastical_year?: EcclesiasticalYear | null;
};

export type InvestitureHistoryEntry = {
  history_id: number;
  enrollment_id: number;
  action: InvestitureAction;
  performed_by?: string | null;
  comments?: string | null;
  created_at: string;
  performer?: InvestitureUser | null;
};

export type PendingEnrollmentsQuery = {
  local_field_id?: number;
  ecclesiastical_year_id?: number;
  page?: number;
  limit?: number;
};

export type PaginatedPendingEnrollments = {
  data: PendingEnrollment[];
  total: number;
  page: number;
  limit: number;
};

// ─── Request payloads ─────────────────────────────────────────────────────────

export type SubmitForValidationPayload = {
  club_id: number;
  comments?: string;
};

export type ValidateEnrollmentPayload = {
  action: ValidateAction;
  comments?: string;
};

export type MarkInvestiturePayload = {
  comments?: string;
};

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/investiture/pending
 * GlobalRolesGuard (admin, coordinator)
 */
export async function getPendingInvestitures(
  query: PendingEnrollmentsQuery = {},
): Promise<PaginatedPendingEnrollments> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.local_field_id) params.local_field_id = query.local_field_id;
  if (query.ecclesiastical_year_id) params.ecclesiastical_year_id = query.ecclesiastical_year_id;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  return apiRequest<PaginatedPendingEnrollments>("/investiture/pending", { params });
}

/**
 * GET /api/v1/enrollments/:enrollmentId/investiture-history
 * JwtAuthGuard
 */
export async function getInvestitureHistory(
  enrollmentId: number,
): Promise<InvestitureHistoryEntry[]> {
  return apiRequest<InvestitureHistoryEntry[]>(
    `/enrollments/${enrollmentId}/investiture-history`,
  );
}

/**
 * POST /api/v1/enrollments/:enrollmentId/submit-for-validation
 * ClubRolesGuard (director, counselor)
 * Client-side only (action mutation)
 */
export async function submitForValidation(
  enrollmentId: number,
  payload: SubmitForValidationPayload,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/enrollments/${enrollmentId}/submit-for-validation`,
    { method: "POST", body: payload },
  );
}

/**
 * POST /api/v1/enrollments/:enrollmentId/validate
 * GlobalRolesGuard (admin, coordinator)
 * Client-side only (action mutation)
 */
export async function validateEnrollment(
  enrollmentId: number,
  payload: ValidateEnrollmentPayload,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/enrollments/${enrollmentId}/validate`,
    { method: "POST", body: payload },
  );
}

/**
 * POST /api/v1/enrollments/:enrollmentId/investiture
 * GlobalRolesGuard (admin, coordinator)
 * Client-side only (action mutation)
 */
export async function markAsInvestido(
  enrollmentId: number,
  payload: MarkInvestiturePayload = {},
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/enrollments/${enrollmentId}/investiture`,
    { method: "POST", body: payload },
  );
}

// ─── Config types ─────────────────────────────────────────────────────────────

export type InvestitureConfig = {
  investiture_config_id: number;
  local_field_id: number;
  ecclesiastical_year_id: number;
  submission_deadline: string;
  investiture_date: string;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  local_fields?: { name: string } | null;
  ecclesiastical_years?: {
    ecclesiastical_year_id: number;
    name: string;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
};

export type CreateInvestitureConfigPayload = {
  local_field_id: number;
  ecclesiastical_year_id: number;
  submission_deadline: string;
  investiture_date: string;
};

export type UpdateInvestitureConfigPayload = {
  submission_deadline?: string;
  investiture_date?: string;
  active?: boolean;
};

// ─── Config API functions ─────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/investiture/config
 * GlobalRolesGuard (admin, coordinator)
 */
export async function getInvestitureConfigs(
  localFieldId?: number,
): Promise<InvestitureConfig[]> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (localFieldId) params.local_field_id = localFieldId;
  const res = await apiRequest<{ status: string; data: InvestitureConfig[] }>(
    "/admin/investiture/config",
    { params },
  );
  return Array.isArray(res) ? res : (res as { data: InvestitureConfig[] }).data ?? [];
}

/**
 * GET /api/v1/admin/investiture/config/:configId
 * GlobalRolesGuard (admin, coordinator)
 */
export async function getInvestitureConfig(
  configId: number,
): Promise<InvestitureConfig> {
  const res = await apiRequest<{ status: string; data: InvestitureConfig }>(
    `/admin/investiture/config/${configId}`,
  );
  return (res as { data: InvestitureConfig }).data ?? (res as unknown as InvestitureConfig);
}

/**
 * POST /api/v1/admin/investiture/config
 * GlobalRolesGuard (admin)
 * Client-side only (mutation)
 */
export async function createInvestitureConfig(
  payload: CreateInvestitureConfigPayload,
): Promise<InvestitureConfig> {
  const res = await apiRequestFromClient<{ status: string; data: InvestitureConfig }>(
    "/admin/investiture/config",
    { method: "POST", body: payload },
  );
  return (res as { data: InvestitureConfig }).data ?? (res as unknown as InvestitureConfig);
}

/**
 * PATCH /api/v1/admin/investiture/config/:configId
 * GlobalRolesGuard (admin)
 * Client-side only (mutation)
 */
export async function updateInvestitureConfig(
  configId: number,
  payload: UpdateInvestitureConfigPayload,
): Promise<InvestitureConfig> {
  const res = await apiRequestFromClient<{ status: string; data: InvestitureConfig }>(
    `/admin/investiture/config/${configId}`,
    { method: "PATCH", body: payload },
  );
  return (res as { data: InvestitureConfig }).data ?? (res as unknown as InvestitureConfig);
}

/**
 * DELETE /api/v1/admin/investiture/config/:configId
 * GlobalRolesGuard (admin)
 * Client-side only (soft-delete sets active=false)
 */
export async function deleteInvestitureConfig(
  configId: number,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/admin/investiture/config/${configId}`,
    { method: "DELETE" },
  );
}
