import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type YearEndPreview = {
  year_id: number;
  year_name?: string | null;
  enrollments_count: number;
  folders_count: number;
  reports_count: number;
  /** Any additional summary fields the backend may return */
  [key: string]: unknown;
};

export type YearEndCloseResult = {
  success: boolean;
  year_id: number;
  year_name?: string | null;
  closed_enrollments?: number | null;
  closed_folders?: number | null;
  closed_reports?: number | null;
  message?: string | null;
  [key: string]: unknown;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPreview(payload: unknown): YearEndPreview {
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    if (root.data && typeof root.data === "object") {
      return root.data as YearEndPreview;
    }
    return root as YearEndPreview;
  }
  return {
    year_id: 0,
    enrollments_count: 0,
    folders_count: 0,
    reports_count: 0,
  };
}

function extractCloseResult(payload: unknown): YearEndCloseResult {
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    if (root.data && typeof root.data === "object") {
      return root.data as YearEndCloseResult;
    }
    return root as YearEndCloseResult;
  }
  return { success: false, year_id: 0 };
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /year-end/:yearId/preview
 * Returns the impact summary: how many enrollments, folders and reports will
 * be affected by closing the given ecclesiastical year.
 *
 * Server-side safe — uses httpOnly cookie token via apiRequest.
 */
export async function getYearEndPreview(yearId: number): Promise<YearEndPreview> {
  const payload = await apiRequest<unknown>(`/year-end/${yearId}/preview`);
  return extractPreview(payload);
}

/**
 * POST /year-end/:yearId/close
 * Triggers the year-end closure process for the given ecclesiastical year.
 *
 * Client-side only (destructive mutation from the browser).
 */
export async function closeYear(yearId: number): Promise<YearEndCloseResult> {
  const payload = await apiRequestFromClient<unknown>(`/year-end/${yearId}/close`, {
    method: "POST",
  });
  return extractCloseResult(payload);
}
