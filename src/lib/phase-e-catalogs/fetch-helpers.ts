/**
 * Shared fetch helpers for Phase E catalog pages.
 * Used by server components to extract items and pagination metadata
 * from backend responses.
 */

type AnyRecord = Record<string, unknown>;

type ListMeta = {
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
