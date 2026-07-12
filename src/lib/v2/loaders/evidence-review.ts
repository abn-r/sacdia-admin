import { ApiError } from "@/lib/api/client";
import {
  getEvidencePending,
  type EvidenceItem,
  type EvidenceType,
} from "@/lib/api/evidence-review";

export type EvidenceReviewQuery = {
  type?: EvidenceType;
  page: number;
  limit: number;
};

export type EvidenceReviewListResult = {
  items: EvidenceItem[];
  pendingCount: number;
  error: { message: string; status: number | null } | null;
};

export function parseEvidenceReviewSearchParams(
  raw: Record<string, string | string[] | undefined>,
): EvidenceReviewQuery {
  const typeRaw = raw.type;
  const type =
    typeof typeRaw === "string" && (typeRaw === "class" || typeRaw === "honor")
      ? typeRaw
      : undefined;

  return {
    type,
    page: 1,
    limit: 200,
  };
}

export async function loadEvidenceReviewList(
  query: EvidenceReviewQuery = { page: 1, limit: 200 },
): Promise<EvidenceReviewListResult> {
  try {
    const result = await getEvidencePending(query.type, query.page, query.limit);
    const items = Array.isArray(result?.data) ? result.data : [];
    const pendingCount = items.filter((item) =>
      ["SUBMITTED", "PENDING_REVIEW"].includes(item.status),
    ).length;

    return { items, pendingCount, error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        items: [],
        pendingCount: 0,
        error: { message: error.message, status: error.status },
      };
    }

    return {
      items: [],
      pendingCount: 0,
      error: { message: "", status: null },
    };
  }
}
