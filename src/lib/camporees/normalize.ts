import type { Camporee } from "@/lib/api/camporees";

export type CamporeeKind = "local" | "union";

type AnyRecord = Record<string, unknown>;

/** A camporee of either kind in the shape the detail screens consume. */
export type NormalizedCamporee = Camporee & {
  kind: CamporeeKind;
  union_id?: number | null;
  union_name?: string | null;
};

export function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === "string") return toText(value);
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function idKeyFor(kind: CamporeeKind): string {
  return kind === "union" ? "union_camporee_id" : "local_camporee_id";
}

/** Unwraps `{ data }` / `{ data: { data } }` envelopes down to the camporee record. */
export function extractCamporeeRecord(
  payload: unknown,
  kind: CamporeeKind,
): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const idKey = idKeyFor(kind);
  const looksLikeCamporee = (r: AnyRecord) =>
    r[idKey] != null || r.camporee_id != null || r.name != null;
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (looksLikeCamporee(nested)) return nested;
    if (nested.data && typeof nested.data === "object") {
      return nested.data as AnyRecord;
    }
  }
  if (looksLikeCamporee(root)) return root;
  return null;
}

/**
 * Normalizes an API camporee keeping EVERY field the edit form needs. The old
 * detail page dropped the deadlines, the agenda date and the order settings,
 * so the edit dialog opened empty and saved those fields as cleared.
 */
export function normalizeCamporee(
  raw: AnyRecord,
  kind: CamporeeKind,
): NormalizedCamporee {
  const idKey = idKeyFor(kind);
  const place =
    kind === "union"
      ? (toText(raw.union_camporee_place) ?? toText(raw.place))
      : toText(raw.local_camporee_place);
  const localField = raw.local_fields as AnyRecord | undefined;
  const unionRel = raw.unions as AnyRecord | undefined;
  return {
    kind,
    camporee_id:
      toPositiveNumber(raw[idKey] ?? raw.camporee_id ?? raw.id) ?? undefined,
    id: toPositiveNumber(raw.id) ?? undefined,
    name: String(raw.name ?? ""),
    description: toText(raw.description),
    start_date: String(raw.start_date ?? ""),
    end_date: String(raw.end_date ?? ""),
    club_registration_deadline: toIsoTimestamp(raw.club_registration_deadline),
    member_registration_deadline: toIsoTimestamp(
      raw.member_registration_deadline,
    ),
    payment_deadline: toIsoTimestamp(raw.payment_deadline),
    agenda_visible_from: toIsoTimestamp(raw.agenda_visible_from),
    local_field_id: toPositiveNumber(raw.local_field_id) ?? undefined,
    union_id:
      kind === "union"
        ? (toPositiveNumber(raw.union_id ?? unionRel?.union_id) ?? null)
        : undefined,
    union_name:
      kind === "union"
        ? (toText(raw.union_name) ?? toText(unionRel?.name))
        : undefined,
    includes_adventurers: raw.includes_adventurers === true,
    includes_pathfinders: raw.includes_pathfinders !== false,
    includes_master_guides: raw.includes_master_guides === true,
    local_camporee_place: place ?? undefined,
    lat: toOptionalNumber(raw.lat),
    long: toOptionalNumber(raw.long),
    registration_cost: toOptionalNumber(raw.registration_cost),
    active: raw.active !== false,
    club_registration_closed_at: toIsoTimestamp(raw.club_registration_closed_at),
    club_registration_closed_by: toText(raw.club_registration_closed_by),
    local_field:
      kind === "local" && localField && typeof localField === "object"
        ? {
            local_field_id: toPositiveNumber(localField.local_field_id) ?? undefined,
            name: toText(localField.name) ?? undefined,
            abbreviation: toText(localField.abbreviation) ?? undefined,
          }
        : undefined,
    orders_enabled: raw.orders_enabled === true,
    orders_opens_at: toIsoTimestamp(raw.orders_opens_at),
    orders_deadline: toIsoTimestamp(raw.orders_deadline),
  };
}

export function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as T[];
    if (root.data && typeof root.data === "object") {
      const nested = root.data as AnyRecord;
      if (Array.isArray(nested.data)) return nested.data as T[];
    }
  }
  return [];
}

export type PagedList<T> = {
  rows: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Rows plus pagination meta of a `{ data, meta }` payload (or a bare array). */
export function extractPagedList<T>(payload: unknown): PagedList<T> {
  const rows = extractList<T>(payload);
  const root =
    payload && typeof payload === "object" ? (payload as AnyRecord) : {};
  const meta =
    root.meta && typeof root.meta === "object" ? (root.meta as AnyRecord) : {};
  const total = Number(meta.total);
  const page = Number(meta.page);
  const limit = Number(meta.limit);
  const totalPages = Number(meta.totalPages);
  return {
    rows,
    total: Number.isFinite(total) ? total : rows.length,
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit: Number.isFinite(limit) && limit >= 1 ? limit : Math.max(rows.length, 1),
    totalPages: Number.isFinite(totalPages) && totalPages >= 1 ? totalPages : 1,
  };
}
