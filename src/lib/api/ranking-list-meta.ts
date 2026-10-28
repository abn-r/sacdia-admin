/**
 * Pagination of the ranking list endpoints (`GET /section-rankings`,
 * `GET /member-rankings`). The backend sends it at the root of the payload:
 * `{ data: [...], total, page, limit }`. Nested `meta` shapes are still read
 * first in case an envelope wraps the response.
 */

export type RankingListMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type GenericRecord = Record<string, unknown>;

function asRecord(value: unknown): GenericRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GenericRecord)
    : null;
}

function pickNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const META_PATHS: string[][] = [["data", "meta"], ["meta"], ["data"], []];

export function normalizeRankingListMeta(payload: unknown): RankingListMeta {
  let meta: GenericRecord | null = null;
  for (const path of META_PATHS) {
    let current: unknown = payload;
    for (const key of path) {
      current = asRecord(current)?.[key];
    }
    const record = asRecord(current);
    if (record && (pickNumber(record.total) !== null || pickNumber(record.totalPages) !== null)) {
      meta = record;
      break;
    }
  }

  const page = pickNumber(meta?.page) ?? 1;
  const limit = pickNumber(meta?.limit) ?? 20;
  const total = pickNumber(meta?.total) ?? 0;
  const totalPages =
    pickNumber(meta?.totalPages) ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { total, page, limit, totalPages };
}
