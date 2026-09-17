import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

export type ContinuationSuggestedClass = {
  status: "pending" | "blocked" | "resolved";
  class_id?: number;
  code?: string;
};

export type ContinuationListItem = {
  user_id: string;
  name: string;
  base_section_id: number;
  ecclesiastical_year_id: number;
  annual_status: "not_enrolled";
  current_role: string | null;
  eligibility: "eligible" | "blocked";
  blocked_reason: string | null;
  suggested_class: ContinuationSuggestedClass;
};

export type ContinuationUserResult = {
  user_id: string;
  outcome: "enrolled" | "already_enrolled" | "blocked" | "failed";
  club_section_id: number;
  ecclesiastical_year_id: number;
  enrollment_id: number | null;
  error_code: string | null;
};

type Envelope<T> = {
  status?: string;
  data?: T;
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as Envelope<T>).data as T;
  }
  return payload as T;
}

export function unwrapContinuationItems(payload: unknown): ContinuationListItem[] {
  const inner = unwrapData<unknown>(payload);
  if (Array.isArray(inner)) {
    return inner as ContinuationListItem[];
  }
  if (inner && typeof inner === "object" && "data" in inner) {
    const rows = (inner as { data?: unknown }).data;
    return Array.isArray(rows) ? (rows as ContinuationListItem[]) : [];
  }
  return [];
}

export async function listAnnualContinuations(
  sectionId: number,
  params?: { page?: number; limit?: number; search?: string },
): Promise<ContinuationListItem[]> {
  const payload = await apiRequest<unknown>(
    `/club-sections/${sectionId}/annual-continuations`,
    { params },
  );
  return unwrapContinuationItems(payload);
}

export async function listAnnualContinuationsFromClient(
  sectionId: number,
  params?: { page?: number; limit?: number; search?: string },
): Promise<ContinuationListItem[]> {
  const payload = await apiRequestFromClient<unknown>(
    `/club-sections/${sectionId}/annual-continuations`,
    { params },
  );
  return unwrapContinuationItems(payload);
}

export async function submitAnnualContinuationsFromClient(
  sectionId: number,
  userIds: string[],
): Promise<ContinuationUserResult[]> {
  const payload = await apiRequestFromClient<unknown>(
    `/club-sections/${sectionId}/annual-continuations`,
    {
      method: "POST",
      body: { user_ids: userIds },
    },
  );
  const inner = unwrapData<{ results?: ContinuationUserResult[] }>(payload);
  return Array.isArray(inner?.results) ? inner.results : [];
}
