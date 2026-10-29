import { apiRequestFromClient } from "@/lib/api/client";

// ─── Types (mirror YearEndService in sacdia-backend) ─────────────────────────

export type YearEndEnrollmentDetail = {
  club_enrollment_id: string;
  clubName: string;
  clubType: string;
  currentStatus: string;
};

/** GET /year-end/:yearId/preview */
export type YearEndPreview = {
  yearId: number;
  yearActive: boolean;
  enrollmentsToClose: number;
  foldersToClose: number;
  /** Draft monthly reports that the closure generates (freezes). */
  reportsToGenerate: number;
  enrollmentDetails: YearEndEnrollmentDetail[];
};

/** POST /year-end/:yearId/close */
export type YearEndCloseResult = {
  yearId: number;
  enrollmentsClosed: number;
  foldersClosed: number;
  reportsGenerated: number;
  investiturePendingClosed: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type GenericRecord = Record<string, unknown>;

function unwrap(payload: unknown): GenericRecord {
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (root.data && typeof root.data === "object") return root.data as GenericRecord;
    return root;
  }
  return {};
}

function count(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function normalizeYearEndPreview(payload: unknown, yearId: number): YearEndPreview {
  const raw = unwrap(payload);
  const details = Array.isArray(raw.enrollmentDetails) ? raw.enrollmentDetails : [];
  return {
    yearId: count(raw.yearId) || yearId,
    yearActive: raw.yearActive === true,
    enrollmentsToClose: count(raw.enrollmentsToClose),
    foldersToClose: count(raw.foldersToClose),
    reportsToGenerate: count(raw.reportsToGenerate),
    enrollmentDetails: details.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as GenericRecord;
      return [
        {
          club_enrollment_id: String(row.club_enrollment_id ?? ""),
          clubName: String(row.clubName ?? ""),
          clubType: String(row.clubType ?? ""),
          currentStatus: String(row.currentStatus ?? ""),
        },
      ];
    }),
  };
}

export function normalizeYearEndCloseResult(payload: unknown, yearId: number): YearEndCloseResult {
  const raw = unwrap(payload);
  return {
    yearId: count(raw.yearId) || yearId,
    enrollmentsClosed: count(raw.enrollmentsClosed),
    foldersClosed: count(raw.foldersClosed),
    reportsGenerated: count(raw.reportsGenerated),
    investiturePendingClosed: count(raw.investiturePendingClosed),
  };
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /year-end/:yearId/preview
 * How many enrollments, folders and draft reports closing the year affects.
 */
export async function getYearEndPreview(yearId: number): Promise<YearEndPreview> {
  const payload = await apiRequestFromClient<unknown>(`/year-end/${yearId}/preview`);
  return normalizeYearEndPreview(payload, yearId);
}

/**
 * POST /year-end/:yearId/close
 * Closes the ecclesiastical year. Client-side only (destructive mutation).
 */
export async function closeYear(yearId: number): Promise<YearEndCloseResult> {
  const payload = await apiRequestFromClient<unknown>(`/year-end/${yearId}/close`, {
    method: "POST",
  });
  return normalizeYearEndCloseResult(payload, yearId);
}
