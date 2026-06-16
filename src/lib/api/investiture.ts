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
  | "CLUB_APPROVED"
  | "COORDINATOR_APPROVED"
  | "FIELD_APPROVED"
  | "INVESTED"
  | "INVESTIDO"
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
  role_name?: string | null;
  role_label?: string | null;
};

export type InvestitureClass = {
  class_id: number;
  name: string;
};

export type InvestitureClub = {
  club_id: number;
  name: string;
};

export type InvestitureSection = {
  section_id: number;
  name?: string | null;
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
  section?: InvestitureSection | null;
  ecclesiastical_year?: EcclesiasticalYear | null;
  submitted_by?: InvestitureUser | null;
  submitted_comment?: string | null;
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

export type InvestitureProgressEvidenceFile = {
  id: string;
  file_id: number;
  file_name: string;
  file_type?: string | null;
  file_url?: string | null;
  uploaded_at?: string | null;
  uploaded_by_name?: string | null;
};

export type InvestitureProgressSection = {
  section_id: number;
  section_name: string;
  completed: boolean;
  score: number;
  status: string;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  validated_by_name?: string | null;
  validated_at?: string | null;
  rejection_reason?: string | null;
  evidence_files: InvestitureProgressEvidenceFile[];
};

export type InvestitureProgressModule = {
  module_id: number;
  module_name: string;
  total_sections: number;
  completed_sections: number;
  progress_percentage: number;
  sections: InvestitureProgressSection[];
};

export type InvestitureClassProgress = {
  enrollment_id: number;
  ecclesiastical_year_id?: number | null;
  class_id: number;
  class_name: string;
  total_sections: number;
  completed_sections: number;
  overall_progress: number;
  modules: InvestitureProgressModule[];
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

  const res = await apiRequest<unknown>("/investiture/pending", { params });
  return normalizePendingEnrollmentsResponse(res, query);
}

/**
 * GET /api/v1/investiture/enrollments/:enrollmentId/history
 * JwtAuthGuard
 */
export async function getInvestitureHistory(
  enrollmentId: number,
): Promise<InvestitureHistoryEntry[]> {
  const res = await apiRequest<unknown>(
    `/investiture/enrollments/${enrollmentId}/history`,
  );
  return normalizeInvestitureHistoryResponse(res);
}

/**
 * GET /api/v1/users/:userId/classes/:classId/progress?enrollmentId=
 * Reuses the class progress contract so investiture detail shows the exact
 * modules, sections, evidence files and validators tied to the enrollment.
 */
export async function getInvestitureClassProgress(params: {
  userId: string;
  classId: number;
  enrollmentId: number;
}): Promise<InvestitureClassProgress> {
  const res = await apiRequest<unknown>(
    `/users/${params.userId}/classes/${params.classId}/progress`,
    { params: { enrollmentId: params.enrollmentId } },
  );
  return normalizeInvestitureClassProgress(res);
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

type RawInvestitureConfig = Partial<InvestitureConfig> & {
  config_id?: number | string | null;
  modified_at?: string | null;
  ecclesiastical_year?: {
    ecclesiastical_year_id?: number | string | null;
    year_id?: number | string | null;
    name?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function pickNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function pickBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function pickDateString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function getDataNode(payload: unknown): unknown {
  const root = asRecord(payload);
  return root && "data" in root ? root.data : payload;
}

function getPaginatedDataNode(payload: unknown): unknown {
  const data = getDataNode(payload);
  const nested = asRecord(data);
  return nested && "data" in nested ? nested.data : data;
}

function getPaginatedMetaNode(payload: unknown): Record<string, unknown> | null {
  const data = getDataNode(payload);
  return asRecord(data)?.meta ? asRecord(asRecord(data)?.meta) : null;
}

function normalizeUser(raw: unknown, fallbackId?: unknown): InvestitureUser | null {
  const user = asRecord(raw);
  const userId = pickString(user?.user_id) ?? pickString(fallbackId);
  if (!user && !userId) return null;

  const firstName = pickString(user?.first_name) ?? pickString(user?.name);
  const joinedLastName = [
    pickString(user?.paternal_last_name),
    pickString(user?.maternal_last_name),
  ]
    .filter(Boolean)
    .join(" ");
  const lastName =
    pickString(user?.last_name) ?? (joinedLastName.length > 0 ? joinedLastName : null);

  return {
    user_id: userId ?? "",
    first_name: firstName,
    last_name: lastName,
    email: pickString(user?.email),
    photo: pickString(user?.photo) ?? pickString(user?.user_image),
    role_name: pickString(user?.role_name),
    role_label: pickString(user?.role_label),
  };
}

function normalizeClass(raw: unknown, fallbackId?: unknown): InvestitureClass | null {
  const klass = asRecord(raw);
  const classId = pickNumber(klass?.class_id) ?? pickNumber(fallbackId);
  const name = pickString(klass?.name);
  if (classId === null && !name) return null;

  return {
    class_id: classId ?? 0,
    name: name ?? `#${classId ?? ""}`,
  };
}

function normalizeClub(raw: unknown): InvestitureClub | null {
  const club = asRecord(raw);
  const clubId = pickNumber(club?.club_id);
  const name = pickString(club?.name);
  if (clubId === null && !name) return null;

  return {
    club_id: clubId ?? 0,
    name: name ?? `#${clubId ?? ""}`,
  };
}

function normalizeSection(raw: unknown): InvestitureSection | null {
  const section = asRecord(raw);
  const sectionId =
    pickNumber(section?.section_id) ?? pickNumber(section?.club_section_id);
  const name = pickString(section?.name);
  if (sectionId === null && !name) return null;

  return {
    section_id: sectionId ?? 0,
    name,
  };
}

function normalizeYear(raw: unknown, fallbackId?: unknown): EcclesiasticalYear | null {
  const year = asRecord(raw);
  const yearId =
    pickNumber(year?.ecclesiastical_year_id) ??
    pickNumber(year?.year_id) ??
    pickNumber(fallbackId);
  if (yearId === null) return null;

  const startDate = pickDateString(year?.start_date);
  const endDate = pickDateString(year?.end_date);

  return {
    ecclesiastical_year_id: yearId,
    name: pickString(year?.name) ?? deriveYearName(yearId, startDate, endDate),
    start_date: startDate,
    end_date: endDate,
  };
}

function normalizePendingEnrollment(raw: unknown): PendingEnrollment {
  const item = asRecord(raw) ?? {};
  const enrollmentId = pickNumber(item.enrollment_id);

  if (enrollmentId === null) {
    throw new Error("Invalid pending enrollment payload");
  }

  const user =
    normalizeUser(item.user) ??
    normalizeUser(item.users) ??
    normalizeUser(null, item.user_id);
  const klass =
    normalizeClass(item.class) ??
    normalizeClass(item.classes) ??
    normalizeClass(null, item.class_id);
  const year =
    normalizeYear(item.ecclesiastical_year, item.ecclesiastical_year_id) ??
    normalizeYear(item.ecclesiastical_years, item.ecclesiastical_year_id);
  const submittedBy =
    normalizeUser(item.submitted_by) ??
    normalizeUser(item.submitter) ??
    normalizeUser(item.submitted_by_user);

  return {
    enrollment_id: enrollmentId,
    investiture_status:
      (pickString(item.investiture_status) ?? pickString(item.status) ?? "SUBMITTED_FOR_VALIDATION") as InvestitureStatus,
    submitted_at: pickDateString(item.submitted_at),
    validated_at: pickDateString(item.validated_at),
    rejection_reason: pickString(item.rejection_reason),
    locked_for_validation: pickBoolean(item.locked_for_validation) ?? undefined,
    user,
    class: klass,
    club: normalizeClub(item.club) ?? normalizeClub(item.clubs),
    section: normalizeSection(item.section) ?? normalizeSection(item.club_section),
    ecclesiastical_year: year,
    submitted_by: submittedBy,
    submitted_comment: pickString(item.submitted_comment),
  };
}

function normalizePendingEnrollmentsResponse(
  payload: unknown,
  query: PendingEnrollmentsQuery,
): PaginatedPendingEnrollments {
  const dataNode = getPaginatedDataNode(payload);
  const rows = Array.isArray(dataNode) ? dataNode : [];
  const meta = getPaginatedMetaNode(payload);

  return {
    data: rows.map(normalizePendingEnrollment),
    total: pickNumber(meta?.total) ?? rows.length,
    page: pickNumber(meta?.page) ?? query.page ?? 1,
    limit: pickNumber(meta?.limit) ?? query.limit ?? rows.length,
  };
}

function normalizeHistoryEntry(raw: unknown): InvestitureHistoryEntry {
  const item = asRecord(raw) ?? {};
  const performerRaw = asRecord(item.performer) ?? asRecord(item.users);
  const performedByRaw = asRecord(item.performed_by);

  return {
    history_id: pickNumber(item.history_id) ?? 0,
    enrollment_id: pickNumber(item.enrollment_id) ?? 0,
    action: (pickString(item.action) ?? "SUBMITTED") as InvestitureAction,
    performed_by: performedByRaw
      ? null
      : pickString(item.performed_by) ?? pickString(item.performedBy),
    comments:
      pickString(item.comments) ??
      pickString(item.reason) ??
      pickString(item.rejection_reason),
    created_at: pickDateString(item.created_at) ?? "",
    performer:
      normalizeUser(performerRaw) ??
      normalizeUser(performedByRaw) ??
      null,
  };
}

function normalizeInvestitureHistoryResponse(payload: unknown): InvestitureHistoryEntry[] {
  const data = getDataNode(payload);
  const historyNode = asRecord(data)?.history ?? data;
  return Array.isArray(historyNode) ? historyNode.map(normalizeHistoryEntry) : [];
}

function normalizeEvidenceFile(raw: unknown): InvestitureProgressEvidenceFile {
  const item = asRecord(raw) ?? {};
  const fileId = pickNumber(item.file_id) ?? pickNumber(item.evidence_file_id) ?? 0;

  return {
    id: pickString(item.id) ?? String(fileId),
    file_id: fileId,
    file_name: pickString(item.file_name) ?? `Archivo #${fileId}`,
    file_type: pickString(item.file_type),
    file_url: pickString(item.file_url),
    uploaded_at: pickDateString(item.uploaded_at),
    uploaded_by_name: pickString(item.uploaded_by_name),
  };
}

function normalizeProgressSection(raw: unknown): InvestitureProgressSection {
  const item = asRecord(raw) ?? {};
  const sectionId = pickNumber(item.section_id) ?? 0;
  const evidenceFiles = Array.isArray(item.evidence_files)
    ? item.evidence_files.map(normalizeEvidenceFile)
    : [];

  return {
    section_id: sectionId,
    section_name: pickString(item.section_name) ?? `Sección #${sectionId}`,
    completed: pickBoolean(item.completed) ?? false,
    score: pickNumber(item.score) ?? 0,
    status: pickString(item.status) ?? "PENDING",
    submitted_by_name: pickString(item.submitted_by_name),
    submitted_at: pickDateString(item.submitted_at),
    validated_by_name: pickString(item.validated_by_name),
    validated_at: pickDateString(item.validated_at),
    rejection_reason: pickString(item.rejection_reason),
    evidence_files: evidenceFiles,
  };
}

function normalizeProgressModule(raw: unknown): InvestitureProgressModule {
  const item = asRecord(raw) ?? {};
  const moduleId = pickNumber(item.module_id) ?? 0;
  const sections = Array.isArray(item.sections)
    ? item.sections.map(normalizeProgressSection)
    : [];

  return {
    module_id: moduleId,
    module_name: pickString(item.module_name) ?? `Módulo #${moduleId}`,
    total_sections: pickNumber(item.total_sections) ?? sections.length,
    completed_sections:
      pickNumber(item.completed_sections) ??
      sections.filter((section) => section.completed).length,
    progress_percentage: pickNumber(item.progress_percentage) ?? 0,
    sections,
  };
}

function normalizeInvestitureClassProgress(payload: unknown): InvestitureClassProgress {
  const data = getDataNode(payload);
  const item = asRecord(data) ?? {};
  const modules = Array.isArray(item.modules)
    ? item.modules.map(normalizeProgressModule)
    : [];

  return {
    enrollment_id: pickNumber(item.enrollment_id) ?? 0,
    ecclesiastical_year_id: pickNumber(item.ecclesiastical_year_id),
    class_id: pickNumber(item.class_id) ?? 0,
    class_name: pickString(item.class_name) ?? "",
    total_sections: pickNumber(item.total_sections) ?? 0,
    completed_sections: pickNumber(item.completed_sections) ?? 0,
    overall_progress: pickNumber(item.overall_progress) ?? 0,
    modules,
  };
}

function deriveYearName(
  yearId: number,
  startDate?: string | null,
  endDate?: string | null,
) {
  const startYear = startDate ? new Date(startDate).getUTCFullYear() : null;
  const endYear = endDate ? new Date(endDate).getUTCFullYear() : null;

  if (startYear && endYear && startYear !== endYear) {
    return `${startYear}–${endYear}`;
  }

  return String(startYear ?? endYear ?? yearId);
}

function normalizeInvestitureConfig(raw: unknown): InvestitureConfig {
  const item = (asRecord(raw) ?? {}) as RawInvestitureConfig;
  const id =
    pickNumber(item.investiture_config_id) ?? pickNumber(item.config_id);
  const localFieldId = pickNumber(item.local_field_id);
  const yearId = pickNumber(item.ecclesiastical_year_id);

  if (id === null || localFieldId === null || yearId === null) {
    throw new Error("Invalid investiture config payload");
  }

  const year =
    asRecord(item.ecclesiastical_years) ?? asRecord(item.ecclesiastical_year);
  const normalizedYearId =
    pickNumber(year?.ecclesiastical_year_id) ??
    pickNumber(year?.year_id) ??
    yearId;
  const yearStartDate = pickString(year?.start_date);
  const yearEndDate = pickString(year?.end_date);

  return {
    investiture_config_id: id,
    local_field_id: localFieldId,
    ecclesiastical_year_id: yearId,
    submission_deadline: pickString(item.submission_deadline) ?? "",
    investiture_date: pickString(item.investiture_date) ?? "",
    active: item.active ?? true,
    created_at: pickString(item.created_at),
    updated_at: pickString(item.updated_at) ?? pickString(item.modified_at),
    local_fields: item.local_fields ?? null,
    ecclesiastical_years: year
      ? {
          ecclesiastical_year_id: normalizedYearId,
          name:
            pickString(year.name) ??
            deriveYearName(normalizedYearId, yearStartDate, yearEndDate),
          start_date: yearStartDate,
          end_date: yearEndDate,
        }
      : null,
  };
}

function normalizeInvestitureConfigList(payload: unknown): InvestitureConfig[] {
  const data = Array.isArray(payload)
    ? payload
    : asRecord(payload)?.data;

  return Array.isArray(data) ? data.map(normalizeInvestitureConfig) : [];
}

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
  return normalizeInvestitureConfigList(res);
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
  return normalizeInvestitureConfig(
    (asRecord(res)?.data ?? res) as unknown,
  );
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
  return normalizeInvestitureConfig(
    (asRecord(res)?.data ?? res) as unknown,
  );
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
  return normalizeInvestitureConfig(
    (asRecord(res)?.data ?? res) as unknown,
  );
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
  | "SUBMITTED"
  | "CLUB_APPROVED"
  | "COORDINATOR_APPROVED"
  | "FIELD_APPROVED"
  | "INVESTED"
  | "REJECTED";

export type PipelineEnrollment = {
  enrollment_id: number;
  status: PipelineStatus;
  submitted_at?: string | null;
  updated_at?: string | null;
  rejection_reason?: string | null;
  user?: InvestitureUser | null;
  class?: InvestitureClass | null;
  club?: InvestitureClub | null;
  section?: InvestitureSection | null;
  ecclesiastical_year?: EcclesiasticalYear | null;
};

export type PipelineHistoryEntry = {
  history_id: number;
  enrollment_id: number;
  action: string;
  performed_by?: string | null;
  reason?: string | null;
  created_at: string;
  performer?: InvestitureUser | null;
};

export type RejectPipelinePayload = {
  reason: string;
};

// ─── Multi-stage pipeline API functions ───────────────────────────────────────

function toBackendPipelineStatus(status: PipelineStatus): InvestitureStatus {
  if (status === "SUBMITTED") return "SUBMITTED_FOR_VALIDATION";
  if (status === "INVESTED") return "INVESTIDO";
  return status;
}

function normalizePipelineStatus(status: InvestitureStatus): PipelineStatus {
  if (status === "SUBMITTED_FOR_VALIDATION") return "SUBMITTED";
  if (status === "INVESTIDO") return "INVESTED";
  if (status === "APPROVED") return "FIELD_APPROVED";
  return status as PipelineStatus;
}

function normalizePipelineEnrollment(raw: unknown): PipelineEnrollment {
  const pending = normalizePendingEnrollment(raw);

  return {
    enrollment_id: pending.enrollment_id,
    status: normalizePipelineStatus(pending.investiture_status),
    submitted_at: pending.submitted_at,
    updated_at: null,
    rejection_reason: pending.rejection_reason,
    user: pending.user,
    class: pending.class,
    club: pending.club,
    section: pending.section,
    ecclesiastical_year: pending.ecclesiastical_year,
  };
}

/**
 * GET /api/v1/investiture/pending?status=
 * List enrollments in the approval pipeline filtered by status.
 */
export async function getPipelineEnrollments(
  status?: PipelineStatus,
): Promise<PipelineEnrollment[]> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (status) params.status = toBackendPipelineStatus(status);

  const res = await apiRequest<unknown>("/investiture/pending", { params });
  const dataNode = getPaginatedDataNode(res);
  const rows = Array.isArray(dataNode) ? dataNode : [];

  return rows.map(normalizePipelineEnrollment);
}

/**
 * GET /api/v1/investiture/enrollments/:enrollmentId/history
 * History for a specific enrollment in the pipeline.
 */
export async function getPipelineHistory(
  enrollmentId: number,
): Promise<PipelineHistoryEntry[]> {
  const res = await apiRequest<unknown>(`/investiture/enrollments/${enrollmentId}/history`);
  return normalizeInvestitureHistoryResponse(res).map((entry) => ({
    ...entry,
    reason: entry.comments,
  }));
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
