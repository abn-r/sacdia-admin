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
