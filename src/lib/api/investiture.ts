import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type InvestitureStatus =
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_VALIDATION"
  | "SUBMITTED"
  | "CLUB_APPROVED"
  | "COORDINATOR_APPROVED"
  | "FIELD_APPROVED"
  | "APPROVED"
  | "REJECTED"
  | "INVESTED"
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

type InvestitureConfigWire = {
  config_id?: number;
  investiture_config_id?: number;
  local_field_id: number;
  ecclesiastical_year_id: number;
  submission_deadline: string;
  investiture_date: string;
  active: boolean;
  created_at?: string | null;
  modified_at?: string | null;
  updated_at?: string | null;
  local_fields?: { name: string } | null;
  ecclesiastical_year?: {
    ecclesiastical_year_id?: number;
    name?: string;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  ecclesiastical_years?: InvestitureConfig["ecclesiastical_years"];
};

function unwrapConfigPayload<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

function normalizeInvestitureConfig(wire: InvestitureConfigWire): InvestitureConfig {
  const configId = wire.investiture_config_id ?? wire.config_id;
  if (typeof configId !== "number") {
    throw new Error("Investiture config payload is missing config id");
  }

  const yearSource = wire.ecclesiastical_years ?? wire.ecclesiastical_year;

  return {
    investiture_config_id: configId,
    local_field_id: wire.local_field_id,
    ecclesiastical_year_id: wire.ecclesiastical_year_id,
    submission_deadline: wire.submission_deadline,
    investiture_date: wire.investiture_date,
    active: wire.active,
    created_at: wire.created_at ?? null,
    updated_at: wire.updated_at ?? wire.modified_at ?? null,
    local_fields: wire.local_fields ?? null,
    ecclesiastical_years: yearSource
      ? {
          ecclesiastical_year_id:
            yearSource.ecclesiastical_year_id ?? wire.ecclesiastical_year_id,
          name: yearSource.name ?? `Año ${wire.ecclesiastical_year_id}`,
          start_date: yearSource.start_date ?? null,
          end_date: yearSource.end_date ?? null,
        }
      : null,
  };
}

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
  const res = await apiRequest<{ status: string; data: InvestitureConfigWire[] } | InvestitureConfigWire[]>(
    "/admin/investiture/config",
    { params },
  );
  const data = unwrapConfigPayload(res);
  const items = Array.isArray(data) ? data : [];
  return items.map(normalizeInvestitureConfig);
}

/**
 * GET /api/v1/admin/investiture/config/:configId
 * GlobalRolesGuard (admin, coordinator)
 */
export async function getInvestitureConfig(
  configId: number,
): Promise<InvestitureConfig> {
  const res = await apiRequest<{ status: string; data: InvestitureConfigWire } | InvestitureConfigWire>(
    `/admin/investiture/config/${configId}`,
  );
  return normalizeInvestitureConfig(unwrapConfigPayload(res));
}

/**
 * POST /api/v1/admin/investiture/config
 * GlobalRolesGuard (admin)
 * Client-side only (mutation)
 */
export async function createInvestitureConfig(
  payload: CreateInvestitureConfigPayload,
): Promise<InvestitureConfig> {
  const res = await apiRequestFromClient<{ status: string; data: InvestitureConfigWire } | InvestitureConfigWire>(
    "/admin/investiture/config",
    { method: "POST", body: payload },
  );
  return normalizeInvestitureConfig(unwrapConfigPayload(res));
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
  const res = await apiRequestFromClient<{ status: string; data: InvestitureConfigWire } | InvestitureConfigWire>(
    `/admin/investiture/config/${configId}`,
    { method: "PATCH", body: payload },
  );
  return normalizeInvestitureConfig(unwrapConfigPayload(res));
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

// ─── Multi-stage pipeline types ───────────────────────────────────────────────

export type PipelineStatus =
  | "SUBMITTED_FOR_VALIDATION"
  | "CLUB_APPROVED"
  | "COORDINATOR_APPROVED"
  | "FIELD_APPROVED"
  | "INVESTIDO"
  | "REJECTED";

export type PipelineEnrollment = {
  enrollment_id: number;
  investiture_status: PipelineStatus;
  submitted_at?: string | null;
  updated_at?: string | null;
  rejection_reason?: string | null;
  user?: InvestitureUser | null;
  class?: InvestitureClass | null;
  club?: InvestitureClub | null;
  section?: { section_id: number; name: string } | null;
  ecclesiastical_year?: EcclesiasticalYear | null;
};

export type PipelineHistoryEntry = {
  history_id: number;
  enrollment_id: number;
  action: string;
  performed_by?: {
    name?: string | null;
    paternal_last_name?: string | null;
  } | null;
  comments?: string | null;
  created_at: string;
};

export type RejectPipelinePayload = {
  reason: string;
};

type PipelinePendingResponse = {
  status: string;
  data: {
    data: PipelineEnrollment[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
};

function getPipelinePaginationError(message: string): Error {
  return new Error(`Investiture pipeline pagination ${message}`);
}

function isValidPipelinePaginationMeta(
  meta: PipelinePendingResponse["data"]["meta"] | undefined,
): meta is PipelinePendingResponse["data"]["meta"] {
  return Boolean(
    meta
      && Number.isInteger(meta.page)
      && meta.page > 0
      && Number.isInteger(meta.limit)
      && meta.limit > 0
      && Number.isInteger(meta.total)
      && meta.total >= 0
      && Number.isInteger(meta.totalPages)
      && meta.totalPages >= 0
      && typeof meta.hasNextPage === "boolean"
      && typeof meta.hasPreviousPage === "boolean",
  );
}

// ─── Multi-stage pipeline API functions ───────────────────────────────────────

/**
 * GET /api/v1/investiture/pending?status=
 * List enrollments in the approval pipeline filtered by status.
 */
export async function getPipelineEnrollments(
  status?: PipelineStatus,
): Promise<PipelineEnrollment[]> {
  const enrollments: PipelineEnrollment[] = [];
  const fetchedPages = new Set<number>();
  const fetchedEnrollmentIds = new Set<number>();
  let requestedPage = 1;
  let expectedTotal: number | undefined;
  let expectedLimit: number | undefined;
  let expectedTotalPages: number | undefined;

  for (
    let requestCount = 0;
    expectedTotalPages === undefined || requestCount < expectedTotalPages;
    requestCount += 1
  ) {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (status) params.status = status;
    if (requestCount > 0) params.page = requestedPage;

    const res = await apiRequest<PipelinePendingResponse>("/investiture/pending", {
      params,
    });
    const payload = res?.data;

    if (!Array.isArray(payload?.data) || !isValidPipelinePaginationMeta(payload.meta)) {
      throw getPipelinePaginationError("returned an invalid response");
    }

    const { meta } = payload;
    if (fetchedPages.has(meta.page)) {
      throw getPipelinePaginationError("returned a repeated page");
    }
    if (meta.page !== requestedPage) {
      throw getPipelinePaginationError("returned an unexpected page");
    }

    const calculatedTotalPages = Math.ceil(meta.total / meta.limit);
    const expectedHasNextPage = meta.totalPages > 0 && meta.page < meta.totalPages;
    const expectedHasPreviousPage = meta.page > 1;
    if (
      (meta.totalPages === 0 && meta.page !== 1)
      || (meta.totalPages > 0 && meta.page > meta.totalPages)
      || meta.totalPages !== calculatedTotalPages
      || meta.hasNextPage !== expectedHasNextPage
      || meta.hasPreviousPage !== expectedHasPreviousPage
    ) {
      throw getPipelinePaginationError("returned inconsistent metadata");
    }
    if (expectedTotalPages === undefined) {
      expectedTotal = meta.total;
      expectedLimit = meta.limit;
      expectedTotalPages = meta.totalPages;
    } else if (
      meta.total !== expectedTotal
      || meta.limit !== expectedLimit
      || meta.totalPages !== expectedTotalPages
    ) {
      throw getPipelinePaginationError("changed metadata between pages");
    }
    if (meta.hasNextPage && payload.data.length !== meta.limit) {
      throw getPipelinePaginationError("returned a short non-final page");
    }
    for (const { enrollment_id } of payload.data) {
      if (fetchedEnrollmentIds.has(enrollment_id)) {
        throw getPipelinePaginationError("returned a duplicated enrollment");
      }
      fetchedEnrollmentIds.add(enrollment_id);
    }

    fetchedPages.add(meta.page);
    enrollments.push(...payload.data);

    if (!meta.hasNextPage) {
      if (enrollments.length !== expectedTotal) {
        throw getPipelinePaginationError("returned incomplete data");
      }
      return enrollments;
    }

    requestedPage = meta.page + 1;
  }

  throw getPipelinePaginationError("exhausted the metadata page bound");
}

/**
 * GET /api/v1/investiture/enrollments/:enrollmentId/history
 * History for a specific enrollment in the pipeline.
 */
export async function getPipelineHistory(
  enrollmentId: number,
): Promise<PipelineHistoryEntry[]> {
  const res = await apiRequest<
    { status: string; data: { enrollment_id: number; history: PipelineHistoryEntry[] } }
  >(`/investiture/enrollments/${enrollmentId}/history`);

  return Array.isArray(res?.data?.history) ? res.data.history : [];
}

/**
 * POST /api/v1/investiture/enrollments/:enrollmentId/submit
 * Counselor submits an enrollment for the approval pipeline.
 * Client-side only.
 */
export async function pipelineSubmit(enrollmentId: number): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/investiture/enrollments/${enrollmentId}/submit`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/investiture/enrollments/:enrollmentId/club-approve
 * Director approves at the club level.
 * Client-side only.
 */
export async function pipelineClubApprove(enrollmentId: number): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/investiture/enrollments/${enrollmentId}/club-approve`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/investiture/enrollments/:enrollmentId/coordinator-approve
 * Coordinator approves.
 * Client-side only.
 */
export async function pipelineCoordinatorApprove(enrollmentId: number): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/investiture/enrollments/${enrollmentId}/coordinator-approve`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/investiture/enrollments/:enrollmentId/field-approve
 * Field officer approves.
 * Client-side only.
 */
export async function pipelineFieldApprove(enrollmentId: number): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/investiture/enrollments/${enrollmentId}/field-approve`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/investiture/enrollments/:enrollmentId/invest
 * Mark the enrollment as invested (ceremony done).
 * Client-side only.
 */
export async function pipelineInvest(enrollmentId: number): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/investiture/enrollments/${enrollmentId}/invest`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/investiture/enrollments/:enrollmentId/reject
 * Reject an enrollment at any stage.
 * Client-side only.
 */
export async function pipelineReject(
  enrollmentId: number,
  payload: RejectPipelinePayload,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/investiture/enrollments/${enrollmentId}/reject`,
    { method: "POST", body: payload },
  );
}

// ─── Bulk operation types ─────────────────────────────────────────────────────

/**
 * club-approve is intentionally absent — the bulk endpoint only supports
 * coordinator-approve, field-approve, and invest. Club directors must use
 * the individual /club-approve endpoint.
 */
export type BulkApproveAction =
  | "coordinator-approve"
  | "field-approve"
  | "invest";

export type BulkApprovePayload = {
  enrollmentIds: number[];
  action: BulkApproveAction;
  comments?: string;
};

export type BulkRejectPayload = {
  enrollmentIds: number[];
  comments: string;
};

export type BulkOperationResult = {
  succeeded: number[];
  failed: { id: number; reason: string }[];
};

// ─── Bulk operation API functions ─────────────────────────────────────────────

/**
 * POST /api/v1/investiture/enrollments/bulk-approve
 * Approve multiple enrollments at once.
 * Client-side only.
 */
export async function bulkApproveEnrollments(
  payload: BulkApprovePayload,
): Promise<BulkOperationResult> {
  const res = await apiRequestFromClient<{
    status: string;
    data: BulkOperationResult;
  }>("/investiture/enrollments/bulk-approve", {
    method: "POST",
    body: payload,
  });
  return (res as { data: BulkOperationResult }).data ?? (res as unknown as BulkOperationResult);
}

/**
 * POST /api/v1/investiture/enrollments/bulk-reject
 * Reject multiple enrollments at once.
 * Client-side only.
 */
export async function bulkRejectEnrollments(
  payload: BulkRejectPayload,
): Promise<BulkOperationResult> {
  const res = await apiRequestFromClient<{
    status: string;
    data: BulkOperationResult;
  }>("/investiture/enrollments/bulk-reject", {
    method: "POST",
    body: payload,
  });
  return (res as { data: BulkOperationResult }).data ?? (res as unknown as BulkOperationResult);
}
