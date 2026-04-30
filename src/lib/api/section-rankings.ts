import { apiRequest, ApiError } from "@/lib/api/client";
import type { MemberRankingItem } from "@/lib/api/member-rankings";

/**
 * Section Rankings API client.
 * Sister module to member-rankings.ts.
 *
 * NOTE: The `awarded_category` field is always null at the section level per
 * the current backend contract — it is reserved for a future roadmap feature.
 * The type is included for forward compatibility only.
 *
 * Re-exports `MemberRankingItem` via import for the drill-down page so callers
 * do not need to import from two places.
 */

// ─── Re-export ─────────────────────────────────────────────────────────────────

export type { MemberRankingItem };

// ─── Types ────────────────────────────────────────────────────────────────────

export type AwardedCategoryRef = {
  scoring_category_id: number | string;
  name: string;
  slug?: string;
};

export type SectionRankingItem = {
  club_section_id: number;
  section_name: string;
  composite_score_pct: number | null;
  rank_position: number | null;
  active_enrollment_count: number;
  awarded_category: AwardedCategoryRef | null;
  composite_calculated_at: string | null;
};

export type SectionRankingsQuery = {
  year_id?: number;
  club_id?: number;
  page?: number;
  limit?: number;
};

export type SectionRankingsResult = {
  items: SectionRankingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  endpointAvailable: boolean;
  endpointState: "available" | "missing" | "forbidden" | "rate-limited" | "unknown";
  endpointDetail: string | null;
};

// ─── Normalizer helpers ────────────────────────────────────────────────────────

type GenericRecord = Record<string, unknown>;

function asRecord(value: unknown): GenericRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GenericRecord)
    : null;
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function pickNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function normalizeAwardedCategory(value: unknown): AwardedCategoryRef | null {
  const r = asRecord(value);
  if (!r) return null;
  const name = pickString(r.name);
  if (!name) return null;
  return {
    scoring_category_id:
      pickNumber(r.scoring_category_id) ??
      pickString(r.scoring_category_id) ??
      0,
    name,
    slug: pickString(r.slug) ?? undefined,
  };
}

// ─── Item normalizer ──────────────────────────────────────────────────────────

function normalizeSectionRankingItem(
  item: GenericRecord,
): SectionRankingItem | null {
  // The backend may return club_section_id or id at top level
  const sectionId =
    pickNumber(item.club_section_id) ?? pickNumber(item.id);
  if (sectionId === null) return null;

  // section_name may come as top-level field or via nested relation
  const sectionNameTopLevel = pickString(item.section_name);
  const clubSectionRel = asRecord(item.club_section);
  const sectionName =
    sectionNameTopLevel ??
    pickString(clubSectionRel?.name) ??
    pickString(item.name) ??
    "Sin nombre";

  return {
    club_section_id: sectionId,
    section_name: sectionName,
    composite_score_pct: pickNumber(item.composite_score_pct),
    rank_position: pickNumber(item.rank_position),
    active_enrollment_count: pickNumber(item.active_enrollment_count) ?? 0,
    awarded_category: normalizeAwardedCategory(
      item.awarded_category ?? item.scoring_category,
    ),
    composite_calculated_at: pickString(item.composite_calculated_at),
  };
}

// ─── Payload extraction ───────────────────────────────────────────────────────

function extractItemArray(payload: unknown): GenericRecord[] {
  const candidates: string[][] = [
    ["data", "data"],
    ["data", "items"],
    ["data"],
    ["items"],
    [],
  ];

  for (const path of candidates) {
    let current: unknown = payload;
    for (const key of path) {
      current = asRecord(current)?.[key];
    }
    if (Array.isArray(current)) {
      return current.filter((v): v is GenericRecord => Boolean(asRecord(v)));
    }
  }

  return [];
}

function normalizeListMeta(payload: unknown): {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const candidates: string[][] = [
    ["data", "meta"],
    ["meta"],
    ["data"],
  ];

  let meta: GenericRecord | null = null;
  for (const path of candidates) {
    let current: unknown = payload;
    for (const key of path) {
      current = asRecord(current)?.[key];
    }
    const r = asRecord(current);
    if (
      r &&
      (pickNumber(r.total) !== null || pickNumber(r.totalPages) !== null)
    ) {
      meta = r;
      break;
    }
  }

  const page = pickNumber(meta?.page) ?? 1;
  const limit = pickNumber(meta?.limit) ?? 20;
  const total = pickNumber(meta?.total) ?? 0;
  const totalPages =
    pickNumber(meta?.totalPages) ??
    Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { total, page, limit, totalPages };
}

// ─── Error normalizers ────────────────────────────────────────────────────────

function normalizeEndpointState(
  error: ApiError,
): SectionRankingsResult["endpointState"] {
  if (error.status === 401 || error.status === 403) return "forbidden";
  if (error.status === 429) return "rate-limited";
  return "missing";
}

function normalizeEndpointDetail(error: ApiError): string {
  if (error.status === 401) return "Sesion expirada o token invalido.";
  if (error.status === 403)
    return "Tu rol no tiene permisos para ver rankings de secciones.";
  if (error.status === 429)
    return "Demasiadas solicitudes. Reintenta en unos segundos.";
  if (error.status >= 500)
    return "El backend no esta disponible temporalmente.";
  return "Endpoint no disponible en backend.";
}

// ─── Flat-array normalizer (drill-down) ───────────────────────────────────────

/**
 * Extracts a flat array from the drill-down endpoint response.
 * Backend returns MemberRankingResponseDto[] — same shape as member-rankings.
 */
function extractFlatArray(payload: unknown): GenericRecord[] {
  // Try outer data wrapper first, then direct array
  const candidates: string[][] = [["data"], []];
  for (const path of candidates) {
    let current: unknown = payload;
    for (const key of path) {
      current = asRecord(current)?.[key];
    }
    if (Array.isArray(current)) {
      return current.filter((v): v is GenericRecord => Boolean(asRecord(v)));
    }
  }
  return [];
}

/**
 * Normalizes a raw member record from the section members endpoint.
 * The backend returns MemberRankingResponseDto which mirrors MemberRankingItem.
 */
function normalizeMemberItem(item: GenericRecord): MemberRankingItem | null {
  const id = pickNumber(item.member_ranking_id);
  const enrollmentId = pickNumber(item.enrollment_id);
  const yearId = pickNumber(item.ecclesiastical_year_id);

  if (id === null || enrollmentId === null || yearId === null) return null;

  const userRaw = asRecord(item.user ?? item.users);
  const sectionRaw = asRecord(item.section ?? item.sections);
  const categoryRaw = asRecord(item.awarded_category ?? item.scoring_category);

  return {
    member_ranking_id: id,
    enrollment_id: enrollmentId,
    ecclesiastical_year_id: yearId,
    rank_position: pickNumber(item.rank_position),
    composite_score_pct: pickNumber(item.composite_score_pct),
    class_score_pct: pickNumber(item.class_score_pct),
    investiture_score_pct: pickNumber(item.investiture_score_pct),
    camporee_score_pct: pickNumber(item.camporee_score_pct),
    awarded_category: categoryRaw
      ? {
          scoring_category_id: pickNumber(categoryRaw.scoring_category_id),
          name: pickString(categoryRaw.name),
          slug: pickString(categoryRaw.slug),
        }
      : null,
    user: userRaw
      ? {
          user_id: pickString(userRaw.user_id),
          name: pickString(userRaw.name),
          first_name: pickString(userRaw.first_name),
          paternal_last_name: pickString(userRaw.paternal_last_name),
          maternal_last_name: pickString(userRaw.maternal_last_name),
          email: pickString(userRaw.email),
        }
      : null,
    section: sectionRaw
      ? {
          section_id: pickNumber(sectionRaw.section_id),
          name: pickString(sectionRaw.name),
        }
      : null,
  };
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/section-rankings
 *
 * Returns a paginated list of section rankings.
 * Filtered by year_id (required in practice) and optionally by club_id.
 * Falls back gracefully if the endpoint is unavailable.
 */
export async function listSectionRankings(
  query: SectionRankingsQuery,
): Promise<SectionRankingsResult> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (query.year_id !== undefined && Number.isFinite(query.year_id) && query.year_id > 0) {
    params.year_id = query.year_id;
  }
  if (query.club_id !== undefined && Number.isFinite(query.club_id) && query.club_id > 0) {
    params.club_id = query.club_id;
  }
  if (query.page !== undefined && Number.isFinite(query.page) && query.page > 0) {
    params.page = query.page;
  }
  if (query.limit !== undefined && Number.isFinite(query.limit) && query.limit > 0) {
    params.limit = query.limit;
  }

  try {
    const payload = await apiRequest<unknown>("/section-rankings", { params });
    const raw = extractItemArray(payload);
    const items = raw
      .map((item) => normalizeSectionRankingItem(item))
      .filter((item): item is SectionRankingItem => Boolean(item));

    const metaRaw = normalizeListMeta(payload);

    return {
      items,
      ...metaRaw,
      endpointAvailable: true,
      endpointState: "available",
      endpointDetail: `Disponible (${metaRaw.total} rankings).`,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        endpointAvailable: false,
        endpointState: normalizeEndpointState(error),
        endpointDetail: normalizeEndpointDetail(error),
      };
    }
    throw error;
  }
}

/**
 * GET /api/v1/section-rankings/:sectionId/members?year_id=N
 *
 * Returns a flat (non-paginated) array of MemberRankingItem for all
 * members in the given section for the given year.
 *
 * Throws ApiError so the caller can map 404/403 → notFound().
 */
export async function getSectionMembers(
  sectionId: number,
  yearId: number,
): Promise<MemberRankingItem[]> {
  const payload = await apiRequest<unknown>(
    `/section-rankings/${sectionId}/members`,
    { params: { year_id: yearId } },
  );

  const raw = extractFlatArray(payload);
  return raw
    .map((item) => normalizeMemberItem(item))
    .filter((item): item is MemberRankingItem => Boolean(item));
}

// ─── Unused import guard ───────────────────────────────────────────────────────
// pickBoolean is defined for forward-safe resilience (e.g., participated field
// if the drill-down contract evolves). Suppress unused-vars warning:
void (pickBoolean as unknown);
