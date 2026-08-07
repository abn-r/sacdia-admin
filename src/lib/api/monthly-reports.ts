import {
  API_BASE_URL,
  apiRequest,
  apiRequestFromClient,
  getClientAuthToken,
} from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ReportStatus = "draft" | "generated" | "submitted";

export type MonthlyReportId = string;
export type MonthlyReportEnrollmentId = string | number;

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonthlyReportAutoData = {
  activities_count?: number | null;
  honors_earned?: number | null;
  classes_completed?: number | null;
  attendance_rate?: number | null;
  members_total?: number | null;
  members_active?: number | null;
  [key: string]: unknown;
};

export type MonthlyReportManualData = {
  // Administración
  weekly_meetings_held?: number | null;
  leadership_meetings?: number | null;
  parent_meetings?: number | null;
  special_events?: number | null;
  administrative_notes?: string | null;
  // Actividad misionera
  bible_studies_conducted?: number | null;
  souls_won?: number | null;
  community_outreach_events?: number | null;
  missionary_trips?: number | null;
  missionary_notes?: string | null;
  // Servicio
  service_hours_total?: number | null;
  service_projects?: number | null;
  volunteers_count?: number | null;
  service_notes?: string | null;
  // Extra
  challenges?: string | null;
  highlights?: string | null;
  prayer_requests?: string | null;
};

export type MonthlyReport = {
  report_id: MonthlyReportId;
  enrollment_id: MonthlyReportEnrollmentId;
  month: number;
  year: number;
  status: ReportStatus;
  auto_data?: MonthlyReportAutoData | null;
  manual_data?: MonthlyReportManualData | null;
  snapshot_data?: MonthlyReportAutoData | null;
  generated_at?: string | null;
  submitted_at?: string | null;
  pdf_r2_key?: string | null;
  pdf_size_bytes?: number | string | null;
  pdf_sha256?: string | null;
  pdf_generated_at?: string | null;
  pdf_template_version?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiEnvelope<T> = { status: string; data: T };

type BackendMonthlyReport = Omit<
  MonthlyReport,
  "report_id" | "enrollment_id"
> & {
  monthly_report_id: string;
  club_enrollment_id: string;
};

function normalizeMonthlyReport(report: BackendMonthlyReport): MonthlyReport {
  const reportId = report.monthly_report_id;
  const enrollmentId = report.club_enrollment_id;

  if (!reportId || !enrollmentId) {
    throw new Error("Respuesta inválida del informe mensual");
  }

  return {
    ...report,
    report_id: reportId,
    enrollment_id: enrollmentId,
  };
}

export type MonthlyReportPreview = {
  enrollment_id: MonthlyReportEnrollmentId;
  month: number;
  year: number;
  auto_data: MonthlyReportAutoData;
};

export type UpdateManualDataPayload = MonthlyReportManualData;

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/monthly-reports/preview/:enrollmentId?month=&year=
 * Live preview of auto-calculated data. Server-side safe.
 */
export async function previewMonthlyReport(
  enrollmentId: MonthlyReportEnrollmentId,
  month: number,
  year: number,
): Promise<MonthlyReportPreview> {
  return apiRequest<MonthlyReportPreview>(
    `/monthly-reports/preview/${encodeURIComponent(String(enrollmentId))}`,
    { params: { month, year } },
  );
}

/**
 * GET /api/v1/monthly-reports/enrollment/:enrollmentId?status=
 * List all reports for an enrollment. Server-side safe.
 */
export async function listMonthlyReports(
  enrollmentId: MonthlyReportEnrollmentId,
  status?: ReportStatus,
): Promise<MonthlyReport[]> {
  const params: Record<string, string | number | undefined> = {};
  if (status) params.status = status;

  const envelope = await apiRequest<ApiEnvelope<BackendMonthlyReport[]>>(
    `/monthly-reports/enrollment/${encodeURIComponent(String(enrollmentId))}`,
    { params },
  );

  return envelope.data.map(normalizeMonthlyReport);
}

/**
 * GET /api/v1/monthly-reports/:reportId
 * Get a single report. Server-side safe.
 */
export async function getMonthlyReport(reportId: MonthlyReportId): Promise<MonthlyReport> {
  const envelope = await apiRequest<ApiEnvelope<BackendMonthlyReport>>(
    `/monthly-reports/${encodeURIComponent(reportId)}`,
  );

  return normalizeMonthlyReport(envelope.data);
}

/**
 * POST /api/v1/monthly-reports/:enrollmentId?month=&year=
 * Create or get existing draft. Client-side only (mutation).
 */
export async function createOrGetDraftReport(
  enrollmentId: MonthlyReportEnrollmentId,
  month: number,
  year: number,
): Promise<MonthlyReport> {
  const envelope = await apiRequestFromClient<ApiEnvelope<BackendMonthlyReport>>(
    `/monthly-reports/${encodeURIComponent(String(enrollmentId))}`,
    {
      method: "POST",
      params: { month, year },
    },
  );

  return normalizeMonthlyReport(envelope.data);
}

/**
 * PATCH /api/v1/monthly-reports/:reportId/manual-data
 * Update manual fields. Client-side only (mutation).
 */
export async function updateManualData(
  reportId: MonthlyReportId,
  payload: UpdateManualDataPayload,
): Promise<MonthlyReport> {
  const envelope = await apiRequestFromClient<ApiEnvelope<BackendMonthlyReport>>(
    `/monthly-reports/${encodeURIComponent(reportId)}/manual-data`,
    {
      method: "PATCH",
      body: payload,
    },
  );

  return normalizeMonthlyReport(envelope.data);
}

/**
 * POST /api/v1/monthly-reports/:reportId/generate
 * Freeze snapshot. Client-side only (mutation).
 */
export async function generateReport(reportId: MonthlyReportId): Promise<MonthlyReport> {
  const envelope = await apiRequestFromClient<ApiEnvelope<BackendMonthlyReport>>(
    `/monthly-reports/${encodeURIComponent(reportId)}/generate`,
    { method: "POST" },
  );

  return normalizeMonthlyReport(envelope.data);
}

/**
 * POST /api/v1/monthly-reports/:reportId/regenerate
 * Re-render the frozen snapshot and overwrite the canonical private PDF artifact.
 * Client-side only (mutation).
 */
export async function regenerateReport(reportId: MonthlyReportId): Promise<MonthlyReport> {
  const envelope = await apiRequestFromClient<ApiEnvelope<BackendMonthlyReport>>(
    `/monthly-reports/${encodeURIComponent(reportId)}/regenerate`,
    { method: "POST" },
  );

  return normalizeMonthlyReport(envelope.data);
}

/**
 * POST /api/v1/monthly-reports/:reportId/submit
 * Submit to field. Client-side only (mutation).
 */
export async function submitReport(reportId: MonthlyReportId): Promise<MonthlyReport> {
  const envelope = await apiRequestFromClient<ApiEnvelope<BackendMonthlyReport>>(
    `/monthly-reports/${encodeURIComponent(reportId)}/submit`,
    { method: "POST" },
  );

  return normalizeMonthlyReport(envelope.data);
}

/**
 * GET /api/v1/monthly-reports/:reportId/pdf
 * Build the backend PDF URL. Do not navigate to this URL directly from the
 * browser; use downloadMonthlyReportPdf so the Bearer token is attached.
 */
export function getReportPdfUrl(reportId: MonthlyReportId): string {
  return `${API_BASE_URL}/monthly-reports/${encodeURIComponent(reportId)}/pdf`;
}

/**
 * Fetches a monthly report PDF with the admin JWT attached as Bearer.
 * Direct browser navigation cannot attach Authorization headers because the
 * admin token lives in an httpOnly cookie on the Next.js app origin.
 */
export async function downloadMonthlyReportPdf(reportId: MonthlyReportId): Promise<Blob> {
  const token = await getClientAuthToken();
  const headers: Record<string, string> = { Accept: "application/pdf" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getReportPdfUrl(reportId), { headers });
  if (!response.ok) {
    throw new Error(`No se pudo descargar el PDF (${response.status})`);
  }

  return response.blob();
}

export async function triggerMonthlyReportPdfDownload(
  reportId: MonthlyReportId,
  filename = `informe-mensual-${reportId}.pdf`,
): Promise<void> {
  const blob = await downloadMonthlyReportPdf(reportId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ─── Admin list ───────────────────────────────────────────────────────────────

export type AdminReportItem = {
  monthly_report_id: string;
  club_enrollment_id: string;
  month: number;
  year: number;
  status: ReportStatus;
  generated_at: string | null;
  submitted_at: string | null;
  club_name: string | null;
  club_type: string | null;
  club_type_id: number | null;
  local_field: string | null;
  local_field_id: number | null;
  submitter_name: string | null;
  member_count: number | null;
};

export type AdminReportFilters = {
  divisionId?: number;
  unionId?: number;
  clubTypeId?: number;
  localFieldId?: number;
  year?: number;
  month?: number;
  status?: string;
  page?: number;
  limit?: number;
};

export type AdminReportsPage = {
  total: number;
  page: number;
  limit: number;
  items: AdminReportItem[];
};

type AdminReportsEnvelope = {
  status: string;
  data: AdminReportsPage;
};

export function buildAdminReportsParams(
  filters: AdminReportFilters,
): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters.divisionId !== undefined) params.division_id = filters.divisionId;
  if (filters.unionId !== undefined) params.union_id = filters.unionId;
  if (filters.clubTypeId !== undefined) params.club_type_id = filters.clubTypeId;
  if (filters.localFieldId !== undefined) params.local_field_id = filters.localFieldId;
  if (filters.year !== undefined) params.year = filters.year;
  if (filters.month !== undefined) params.month = filters.month;
  if (filters.status !== undefined) params.status = filters.status;
  if (filters.page !== undefined) params.page = filters.page;
  if (filters.limit !== undefined) params.limit = filters.limit;

  return params;
}

/**
 * GET /api/v1/monthly-reports/admin/list
 * Paginated multi-club report list for admins. Server-side safe.
 */
export async function listAdminReports(
  filters: AdminReportFilters,
): Promise<AdminReportsPage> {
  const params = buildAdminReportsParams(filters);

  const envelope = await apiRequest<AdminReportsEnvelope>(
    "/monthly-reports/admin/list",
    { params },
  );

  return envelope.data;
}
