import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ReportStatus = "draft" | "generated" | "submitted";

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
  report_id: number;
  enrollment_id: number;
  month: number;
  year: number;
  status: ReportStatus;
  auto_data?: MonthlyReportAutoData | null;
  manual_data?: MonthlyReportManualData | null;
  snapshot_data?: MonthlyReportAutoData | null;
  generated_at?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MonthlyReportPreview = {
  enrollment_id: number;
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
  enrollmentId: number,
  month: number,
  year: number,
): Promise<MonthlyReportPreview> {
  return apiRequest<MonthlyReportPreview>(
    `/monthly-reports/preview/${enrollmentId}`,
    { params: { month, year } },
  );
}

/**
 * GET /api/v1/monthly-reports/enrollment/:enrollmentId?status=
 * List all reports for an enrollment. Server-side safe.
 */
export async function listMonthlyReports(
  enrollmentId: number,
  status?: ReportStatus,
): Promise<MonthlyReport[]> {
  const params: Record<string, string | number | undefined> = {};
  if (status) params.status = status;

  return apiRequest<MonthlyReport[]>(
    `/monthly-reports/enrollment/${enrollmentId}`,
    { params },
  );
}

/**
 * GET /api/v1/monthly-reports/:reportId
 * Get a single report. Server-side safe.
 */
export async function getMonthlyReport(reportId: number): Promise<MonthlyReport> {
  return apiRequest<MonthlyReport>(`/monthly-reports/${reportId}`);
}

/**
 * POST /api/v1/monthly-reports/:enrollmentId?month=&year=
 * Create or get existing draft. Client-side only (mutation).
 */
export async function createOrGetDraftReport(
  enrollmentId: number,
  month: number,
  year: number,
): Promise<MonthlyReport> {
  return apiRequestFromClient<MonthlyReport>(
    `/monthly-reports/${enrollmentId}`,
    {
      method: "POST",
      params: { month, year },
    },
  );
}

/**
 * PATCH /api/v1/monthly-reports/:reportId/manual-data
 * Update manual fields. Client-side only (mutation).
 */
export async function updateManualData(
  reportId: number,
  payload: UpdateManualDataPayload,
): Promise<MonthlyReport> {
  return apiRequestFromClient<MonthlyReport>(
    `/monthly-reports/${reportId}/manual-data`,
    {
      method: "PATCH",
      body: payload,
    },
  );
}

/**
 * POST /api/v1/monthly-reports/:reportId/generate
 * Freeze snapshot. Client-side only (mutation).
 */
export async function generateReport(reportId: number): Promise<MonthlyReport> {
  return apiRequestFromClient<MonthlyReport>(
    `/monthly-reports/${reportId}/generate`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/monthly-reports/:reportId/submit
 * Submit to field. Client-side only (mutation).
 */
export async function submitReport(reportId: number): Promise<MonthlyReport> {
  return apiRequestFromClient<MonthlyReport>(
    `/monthly-reports/${reportId}/submit`,
    { method: "POST" },
  );
}

/**
 * GET /api/v1/monthly-reports/:reportId/pdf
 * Download PDF blob URL. Client-side only.
 */
export function getReportPdfUrl(reportId: number): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000/api/v1";
  return `${base}/monthly-reports/${reportId}/pdf`;
}
