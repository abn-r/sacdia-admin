import {
  API_BASE_URL,
  apiRequest,
  apiRequestFromClient,
  getClientAuthToken,
} from "@/lib/api/client";
import { filenameFromContentDisposition } from "@/lib/api/monthly-reports";
import { unwrapApiData } from "@/lib/api/unwrap";

export type AnnualReport = {
  annual_report_id: number;
  club_id: number;
  ecclesiastical_year_id: number;
  status?: string | null;
  created_at?: string | null;
  finalized_at?: string | null;
  ecclesiastical_year?: {
    year_id: number;
    start_date?: string;
    end_date?: string;
  } | null;
  finalized_by_user?: {
    user_id: string;
    name?: string | null;
    paternal_last_name?: string | null;
  } | null;
};

export type QuarterlyReport = {
  quarterly_report_id: number;
  club_id: number;
  /** Calendar year of the quarter. Quarterly reports have no ecclesiastical year. */
  year?: number | null;
  quarter?: number | null;
  status?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
};

export async function listClubAnnualReports(clubId: number) {
  const payload = await apiRequest<unknown>(`/clubs/${clubId}/annual-reports`);
  return unwrapApiData<AnnualReport[]>(payload);
}

export async function listClubQuarterlyReports(clubId: number, year?: number) {
  const payload = await apiRequest<unknown>(`/clubs/${clubId}/quarterly-reports`, {
    params: year ? { year } : undefined,
  });
  return unwrapApiData<QuarterlyReport[]>(payload);
}

// ─── Admin quarterly / annual reports ─────────────────────────────────────────

/** Backend statuses: draft = Borrador, finalized = Finalizado, archived = Archivado. */
export type PeriodicReportStatus = "draft" | "finalized" | "archived";

export type PeriodicReportClub = {
  club_id: number;
  name: string;
  churches?: { name?: string | null } | null;
  districts?: { name?: string | null } | null;
};

export type PeriodicReportFinalizer = {
  user_id: string;
  name?: string | null;
  paternal_last_name?: string | null;
};

export type ReportDirectivaMember = {
  role?: string | null;
  user_id?: string | null;
  name?: string | null;
};

/** Frozen figures shared by quarterly and annual `computed_data`. Every key may be missing. */
export type PeriodicComputedBase = {
  member_count?: number | null;
  directiva?: ReportDirectivaMember[] | null;
  honors?: { started?: number | null; completed?: number | null } | null;
  activities?: { total?: number | null } | null;
  finances?: {
    income?: number | null;
    expenses?: number | null;
    balance?: number | null;
    transactions?: number | null;
  } | null;
};

export type QuarterlyComputedData = PeriodicComputedBase & {
  quarter_label?: string | null;
  year?: number | null;
  quarter?: number | null;
  months_in_quarter?: number[] | null;
  missionary?: { baptized_this_quarter?: number | null } | null;
};

export type AnnualComputedData = PeriodicComputedBase & {
  ecclesiastical_year_id?: number | null;
  year_label?: string | null;
  months_reported?: number | null;
  missionary?: { baptized_total?: number | null } | null;
  ranking_percentile?: number | null;
  top_achievers?:
    | { user_id?: string | null; name?: string | null; honors_count?: number | null }[]
    | null;
};

/** Fields of `UpdateQuarterlyManualDataDto` (sacdia-backend). */
export type QuarterlyManualData = {
  planning_meetings?: number | null;
  parent_meetings?: number | null;
  youth_council_attendance?: number | null;
  church_board_attendance?: number | null;
  soul_target?: number | null;
  baptized_this_quarter?: number | null;
  club_participation_description?: string | null;
  community_service_description?: string | null;
  camporees_attended?: number | null;
  certificates_delivered?: boolean | null;
};

/** Fields of `UpdateAnnualManualDataDto` (sacdia-backend). */
export type AnnualManualData = {
  planning_meetings?: number | null;
  parent_meetings?: number | null;
  baptized_this_year?: number | null;
  total_baptized?: number | null;
  camporees_attended?: number | null;
  annual_achievements_description?: string | null;
  community_service_description?: string | null;
  all_investitures_completed?: boolean | null;
};

type PeriodicReportBase = {
  club_id: number;
  status: PeriodicReportStatus | string;
  auto_generated_at?: string | null;
  finalized_at?: string | null;
  finalized_by?: string | null;
  pdf_url?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
  club?: PeriodicReportClub | null;
  finalized_by_user?: PeriodicReportFinalizer | null;
};

export type AdminQuarterlyReport = PeriodicReportBase & {
  quarterly_report_id: number;
  year: number;
  quarter: number;
  computed_data?: QuarterlyComputedData | null;
  manual_data?: QuarterlyManualData | null;
};

export type AdminAnnualReport = PeriodicReportBase & {
  annual_report_id: number;
  ecclesiastical_year_id: number;
  ecclesiastical_year?: {
    year_id: number;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  computed_data?: AnnualComputedData | null;
  manual_data?: AnnualManualData | null;
};

export type PeriodicReportsPage<T> = {
  total: number;
  page: number;
  limit: number;
  items: T[];
};

export type AdminQuarterlyReportFilters = {
  clubId?: number;
  year?: number;
  quarter?: number;
  status?: string;
  page?: number;
  limit?: number;
};

export type AdminAnnualReportFilters = {
  clubId?: number;
  ecclesiasticalYearId?: number;
  status?: string;
  page?: number;
  limit?: number;
};

export const PERIODIC_REPORT_STATUSES: readonly PeriodicReportStatus[] = [
  "draft",
  "finalized",
  "archived",
];

export const REPORT_QUARTERS = [1, 2, 3, 4] as const;

/** "2025-2026" (or "2026" when the ecclesiastical year starts and ends in the same year). */
export function ecclesiasticalYearLabel(
  year:
    | { start_date?: string | null; end_date?: string | null }
    | null
    | undefined,
): string | null {
  const start = year?.start_date?.slice(0, 4);
  const end = year?.end_date?.slice(0, 4);
  if (!start) return null;
  return end && end !== start ? `${start}-${end}` : start;
}

/** "Ana García" from the `finalized_by_user` relation; null when missing. */
export function formatReportFinalizerName(
  user: PeriodicReportFinalizer | null | undefined,
): string | null {
  const name = [user?.name, user?.paternal_last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || null;
}

function compactParams(
  params: Record<string, string | number | undefined>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") out[key] = value;
  }
  return out;
}

// ── Quarterly ────────────────────────────────────────────────────────────────

/** GET /admin/quarterly-reports — paginated, scoped by the actor's territory. */
export async function listAdminQuarterlyReports(
  filters: AdminQuarterlyReportFilters = {},
): Promise<PeriodicReportsPage<AdminQuarterlyReport>> {
  const payload = await apiRequest<unknown>("/admin/quarterly-reports", {
    params: compactParams({
      clubId: filters.clubId,
      year: filters.year,
      quarter: filters.quarter,
      status: filters.status,
      page: filters.page,
      limit: filters.limit,
    }),
  });
  return unwrapApiData<PeriodicReportsPage<AdminQuarterlyReport>>(payload);
}

/** GET /admin/quarterly-reports/:id */
export async function getAdminQuarterlyReport(id: number | string): Promise<AdminQuarterlyReport> {
  const payload = await apiRequest<unknown>(`/admin/quarterly-reports/${encodeURIComponent(String(id))}`);
  return unwrapApiData<AdminQuarterlyReport>(payload);
}

/**
 * POST /admin/quarterly-reports/generate. Creates the draft when missing and
 * computes it; an already finalized report comes back unchanged.
 * Client-side only (mutation).
 */
export async function generateQuarterlyReport(input: {
  clubId: number;
  year: number;
  quarter: number;
}): Promise<AdminQuarterlyReport> {
  const payload = await apiRequestFromClient<unknown>("/admin/quarterly-reports/generate", {
    method: "POST",
    body: { club_id: input.clubId, year: input.year, quarter: input.quarter },
  });
  return unwrapApiData<AdminQuarterlyReport>(payload);
}

/** PATCH /admin/quarterly-reports/:id — draft only. Client-side only (mutation). */
export async function updateQuarterlyReportManualData(
  id: number,
  body: QuarterlyManualData,
): Promise<AdminQuarterlyReport> {
  const payload = await apiRequestFromClient<unknown>(`/admin/quarterly-reports/${id}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminQuarterlyReport>(payload);
}

/** POST /admin/quarterly-reports/:id/regenerate. Client-side only (mutation). */
export async function regenerateQuarterlyReport(id: number): Promise<AdminQuarterlyReport> {
  const payload = await apiRequestFromClient<unknown>(`/admin/quarterly-reports/${id}/regenerate`, {
    method: "POST",
  });
  return unwrapApiData<AdminQuarterlyReport>(payload);
}

/** POST /admin/quarterly-reports/:id/finalize — irreversible. Client-side only (mutation). */
export async function finalizeQuarterlyReport(id: number): Promise<AdminQuarterlyReport> {
  const payload = await apiRequestFromClient<unknown>(`/admin/quarterly-reports/${id}/finalize`, {
    method: "POST",
  });
  return unwrapApiData<AdminQuarterlyReport>(payload);
}

// ── Annual ───────────────────────────────────────────────────────────────────

/** GET /admin/annual-reports — paginated, scoped by the actor's territory. */
export async function listAdminAnnualReports(
  filters: AdminAnnualReportFilters = {},
): Promise<PeriodicReportsPage<AdminAnnualReport>> {
  const payload = await apiRequest<unknown>("/admin/annual-reports", {
    params: compactParams({
      clubId: filters.clubId,
      ecclesiasticalYearId: filters.ecclesiasticalYearId,
      status: filters.status,
      page: filters.page,
      limit: filters.limit,
    }),
  });
  return unwrapApiData<PeriodicReportsPage<AdminAnnualReport>>(payload);
}

/** GET /admin/annual-reports/:id */
export async function getAdminAnnualReport(id: number | string): Promise<AdminAnnualReport> {
  const payload = await apiRequest<unknown>(`/admin/annual-reports/${encodeURIComponent(String(id))}`);
  return unwrapApiData<AdminAnnualReport>(payload);
}

/**
 * POST /admin/annual-reports/generate. Creates the draft when missing and
 * computes it; an already finalized report comes back unchanged.
 * Client-side only (mutation).
 */
export async function generateAnnualReport(input: {
  clubId: number;
  ecclesiasticalYearId: number;
}): Promise<AdminAnnualReport> {
  const payload = await apiRequestFromClient<unknown>("/admin/annual-reports/generate", {
    method: "POST",
    body: { club_id: input.clubId, ecclesiastical_year_id: input.ecclesiasticalYearId },
  });
  return unwrapApiData<AdminAnnualReport>(payload);
}

/** PATCH /admin/annual-reports/:id — draft only. Client-side only (mutation). */
export async function updateAnnualReportManualData(
  id: number,
  body: AnnualManualData,
): Promise<AdminAnnualReport> {
  const payload = await apiRequestFromClient<unknown>(`/admin/annual-reports/${id}`, {
    method: "PATCH",
    body,
  });
  return unwrapApiData<AdminAnnualReport>(payload);
}

/** POST /admin/annual-reports/:id/regenerate. Client-side only (mutation). */
export async function regenerateAnnualReport(id: number): Promise<AdminAnnualReport> {
  const payload = await apiRequestFromClient<unknown>(`/admin/annual-reports/${id}/regenerate`, {
    method: "POST",
  });
  return unwrapApiData<AdminAnnualReport>(payload);
}

/** POST /admin/annual-reports/:id/finalize — irreversible. Client-side only (mutation). */
export async function finalizeAnnualReport(id: number): Promise<AdminAnnualReport> {
  const payload = await apiRequestFromClient<unknown>(`/admin/annual-reports/${id}/finalize`, {
    method: "POST",
  });
  return unwrapApiData<AdminAnnualReport>(payload);
}

// ── PDF ──────────────────────────────────────────────────────────────────────

/**
 * Fetches the report PDF with the admin JWT as Bearer (the token lives in an
 * httpOnly cookie, so a plain link cannot authenticate) and saves it under the
 * filename the server sent in Content-Disposition.
 */
async function downloadAdminReportPdf(
  path: string,
  fallbackFilename: string,
): Promise<void> {
  const token = await getClientAuthToken();
  const headers: Record<string, string> = { Accept: "application/pdf" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`No se pudo descargar el PDF (${response.status})`);
  }

  const filename = filenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    fallbackFilename,
  );
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** GET /admin/quarterly-reports/:id/pdf */
export function triggerQuarterlyReportPdfDownload(id: number): Promise<void> {
  return downloadAdminReportPdf(
    `/admin/quarterly-reports/${id}/pdf`,
    `informe-trimestral-${id}.pdf`,
  );
}

/** GET /admin/annual-reports/:id/pdf */
export function triggerAnnualReportPdfDownload(id: number): Promise<void> {
  return downloadAdminReportPdf(
    `/admin/annual-reports/${id}/pdf`,
    `informe-anual-${id}.pdf`,
  );
}
