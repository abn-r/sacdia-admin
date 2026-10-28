/**
 * Shared fetch helpers for Phase E catalog pages.
 * Used by server components to extract items and pagination metadata
 * from backend responses.
 */

type AnyRecord = Record<string, unknown>;

export type ListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toRecord(value: unknown): AnyRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as AnyRecord;
}

export function extractItems(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  const root = toRecord(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data as AnyRecord[];
  const nested = toRecord(root.data);
  if (nested && Array.isArray(nested.data)) return nested.data as AnyRecord[];
  if (nested && Array.isArray(nested.items)) return nested.items as AnyRecord[];
  return [];
}

export function extractMeta(
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackTotal: number,
): ListMeta {
  const root = toRecord(payload);
  const nested = toRecord(root?.data);
  const metaRecord =
    toRecord(nested?.meta) ?? toRecord(root?.meta) ?? nested;

  const page = toPositiveNumber(metaRecord?.page) ?? fallbackPage;
  const limit = toPositiveNumber(metaRecord?.limit) ?? fallbackLimit;
  const total =
    toPositiveNumber(metaRecord?.total) ??
    toPositiveNumber(metaRecord?.count) ??
    fallbackTotal;
  const totalPages =
    toPositiveNumber(metaRecord?.totalPages) ??
    toPositiveNumber(metaRecord?.total_pages) ??
    Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { page, limit, total, totalPages };
}

/**
 * Slices an in-memory list into one page. `page` is clamped to the last page so a
 * stale `?page=` never renders an empty table.
 */
export function paginateInMemory<T>(
  items: readonly T[],
  page: number,
  limit: number,
): { items: T[]; meta: ListMeta } {
  const safeLimit = Math.max(1, Math.floor(limit) || 1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  return {
    items: items.slice(start, start + safeLimit),
    meta: { page: safePage, limit: safeLimit, total, totalPages },
  };
}

/**
 * Items + pagination meta for a catalog list.
 *
 * Several admin endpoints (class sections/modules, diseases, relationship
 * types...) ignore `page`/`limit` and answer with the whole catalog. When the
 * response does not describe a larger result set than the rows we hold
 * (`meta.total <= items.length`) the API did not paginate, so the requested
 * page is cut here instead of rendering every row under a "Page 1 of N" pager.
 * A server that paginates reports `meta.total` above the rows of one page and
 * is passed through untouched.
 *
 * Pass the items AFTER any local filtering/sorting.
 */
export function paginateLoadedItems<T>(
  items: T[],
  payload: unknown,
  page: number,
  limit: number,
): { items: T[]; meta: ListMeta } {
  const meta = extractMeta(payload, page, limit, items.length);
  if (meta.total > items.length) return { items, meta };
  return paginateInMemory(items, page, limit);
}

export function readParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.find((e) => typeof e === "string");
  return undefined;
}

export function readPositiveNumberParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): number | undefined {
  const v = readParam(raw, key);
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}
