import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberOfMonthEntry = {
  user_id: string;
  name: string;
  photo_url: string | null;
  total_points: number;
};

export type MemberOfMonth = {
  month: number;
  year: number;
  members: MemberOfMonthEntry[];
};

export type MemberOfMonthHistoryItem = {
  month: number;
  year: number;
  members: MemberOfMonthEntry[];
};

export type MemberOfMonthHistoryResponse = {
  data: MemberOfMonthHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
};

export type EvaluateMemberOfMonthPayload = {
  month: number;
  year: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractCurrentMember(payload: unknown): MemberOfMonth | null {
  if (!payload || typeof payload !== "object") return null;
  if ("data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (!data) return null;
    return data as MemberOfMonth;
  }
  if ("month" in payload) return payload as MemberOfMonth;
  return null;
}

function extractHistory(payload: unknown): MemberOfMonthHistoryResponse {
  if (payload && typeof payload === "object") {
    if ("data" in payload && "pagination" in payload) {
      return payload as MemberOfMonthHistoryResponse;
    }
    if ("data" in payload) {
      const data = (payload as { data: unknown }).data;
      if (data && typeof data === "object" && "data" in data) {
        return data as MemberOfMonthHistoryResponse;
      }
    }
  }
  return { data: [], pagination: { page: 1, limit: 12, total: 0 } };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * GET /clubs/:clubId/sections/:sectionId/member-of-month
 * Get current month's member of the month for a section.
 * Returns null if no evaluation has been run yet for the current month.
 * Server-side safe (uses apiRequest).
 */
export async function getMemberOfMonth(
  clubId: number,
  sectionId: number,
): Promise<MemberOfMonth | null> {
  try {
    const res = await apiRequest<unknown>(
      `/clubs/${clubId}/sections/${sectionId}/member-of-month`,
    );
    return extractCurrentMember(res);
  } catch {
    return null;
  }
}

/**
 * GET /clubs/:clubId/sections/:sectionId/member-of-month/history
 * Get paginated history of member of the month for a section.
 * Client-side only (uses apiRequestFromClient).
 */
export async function getMemberOfMonthHistory(
  clubId: number,
  sectionId: number,
  page: number = 1,
  limit: number = 12,
): Promise<MemberOfMonthHistoryResponse> {
  const res = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/sections/${sectionId}/member-of-month/history`,
    { params: { page, limit } },
  );
  return extractHistory(res);
}

/**
 * POST /clubs/:clubId/sections/:sectionId/member-of-month/evaluate
 * Trigger manual evaluation for a specific month/year.
 * Club directors only.
 */
export async function evaluateMemberOfMonth(
  clubId: number,
  sectionId: number,
  payload: EvaluateMemberOfMonthPayload,
): Promise<void> {
  await apiRequestFromClient(
    `/clubs/${clubId}/sections/${sectionId}/member-of-month/evaluate`,
    { method: "POST", body: payload },
  );
}

// ─── Admin supervision types ──────────────────────────────────────────────────

export type AdminMomFilters = {
  club_type_id?: number;
  local_field_id?: number;
  club_id?: number;
  section_id?: number;
  year?: number;
  month?: number;
  notified?: boolean;
  page?: number;
  limit?: number;
};

export type AdminMomItem = {
  member_of_month_id: number;
  user_id: string;
  user_name: string | null;
  user_image: string | null;
  club_section_id: number;
  section_name: string | null;
  club_type: string | null;
  club_id: number | null;
  club_name: string | null;
  local_field: string | null;
  local_field_id: number | null;
  month: number;
  year: number;
  total_points: number;
  notified: boolean;
  created_at: string;
};

export type AdminMomPage = {
  total: number;
  page: number;
  limit: number;
  items: AdminMomItem[];
};

type AdminMomEnvelope = {
  status: string;
  data: AdminMomPage;
};

/**
 * GET /member-of-month/admin/list — supervision multi-sección
 * Server-safe (uses apiRequest identical pattern to listAdminReports).
 */
export async function listAdminMemberOfMonth(
  filters: AdminMomFilters,
): Promise<AdminMomPage> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters.club_type_id !== undefined) params.club_type_id = filters.club_type_id;
  if (filters.local_field_id !== undefined) params.local_field_id = filters.local_field_id;
  if (filters.club_id !== undefined) params.club_id = filters.club_id;
  if (filters.section_id !== undefined) params.section_id = filters.section_id;
  if (filters.year !== undefined) params.year = filters.year;
  if (filters.month !== undefined) params.month = filters.month;
  if (filters.notified !== undefined) params.notified = filters.notified;
  if (filters.page !== undefined) params.page = filters.page;
  if (filters.limit !== undefined) params.limit = filters.limit;

  const envelope = await apiRequest<AdminMomEnvelope>(
    "/member-of-month/admin/list",
    { params },
  );

  return envelope.data;
}
