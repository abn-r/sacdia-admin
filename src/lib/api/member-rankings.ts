import { apiRequest, ApiError } from "@/lib/api/client";

/**
 * Member Rankings API client.
 *
 * NOTE: The plan spec uses `MemberRankingResponse` (flat shape with
 * `member_name`, `section_name`, etc. at top level). This implementation
 * uses `MemberRankingItem` (nested `user`/`section` objects) for better
 * resilience against backend envelope variations. Task 18 (breakdown page)
 * should import `MemberRankingItem` from this file, NOT `MemberRankingResponse`.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberRankingCategory = {
  scoring_category_id?: number | null;
  name?: string | null;
  slug?: string | null;
};

export type MemberRankingItem = {
  member_ranking_id: number;
  enrollment_id: number;
  ecclesiastical_year_id: number;
  rank_position: number | null;
  composite_score_pct: number | null;
  class_score_pct: number | null;
  investiture_score_pct: number | null;
  camporee_score_pct: number | null;
  awarded_category?: MemberRankingCategory | null;
  // Nested relations from backend
  user?: {
    user_id?: string | null;
    name?: string | null;
    first_name?: string | null;
    paternal_last_name?: string | null;
    maternal_last_name?: string | null;
    email?: string | null;
  } | null;
  section?: {
    section_id?: number | null;
    name?: string | null;
  } | null;
};

export type MemberRankingsQuery = {
  year_id: number;
  club_id?: number;
  section_id?: number;
  page?: number;
  limit?: number;
};

export type MemberRankingsListResult = {
  items: MemberRankingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  endpointAvailable: boolean;
  endpointState: "available" | "forbidden" | "missing" | "rate-limited";
  endpointDetail: string;
};

// ─── Normalizers ──────────────────────────────────────────────────────────────

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

function normalizeCategory(value: unknown): MemberRankingCategory | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    scoring_category_id: pickNumber(r.scoring_category_id),
    name: pickString(r.name),
    slug: pickString(r.slug),
  };
}

function normalizeMemberRankingItem(item: GenericRecord): MemberRankingItem | null {
  const id = pickNumber(item.member_ranking_id);
  const enrollmentId = pickNumber(item.enrollment_id);
  const yearId = pickNumber(item.ecclesiastical_year_id);

  if (id === null || enrollmentId === null || yearId === null) return null;

  const userRaw = asRecord(item.user ?? item.users);
  const sectionRaw = asRecord(item.section ?? item.sections);

  return {
    member_ranking_id: id,
    enrollment_id: enrollmentId,
    ecclesiastical_year_id: yearId,
    rank_position: pickNumber(item.rank_position),
    composite_score_pct: pickNumber(item.composite_score_pct),
    class_score_pct: pickNumber(item.class_score_pct),
    investiture_score_pct: pickNumber(item.investiture_score_pct),
    camporee_score_pct: pickNumber(item.camporee_score_pct),
    awarded_category: normalizeCategory(item.awarded_category ?? item.scoring_category),
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
    if (r && (pickNumber(r.total) !== null || pickNumber(r.totalPages) !== null)) {
      meta = r;
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

function normalizeEndpointState(
  error: ApiError,
): MemberRankingsListResult["endpointState"] {
  if (error.status === 401 || error.status === 403) return "forbidden";
  if (error.status === 429) return "rate-limited";
  return "missing";
}

function normalizeEndpointDetail(error: ApiError): string {
  if (error.status === 401) return "Sesion expirada o token invalido.";
  if (error.status === 403) return "Tu rol no tiene permisos para ver rankings de miembros.";
  if (error.status === 429) return "Demasiadas solicitudes. Reintenta en unos segundos.";
  if (error.status >= 500) return "El backend no esta disponible temporalmente.";
  return "Endpoint no disponible en backend.";
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/member-rankings
 * Fetches paginated member rankings for a given ecclesiastical year.
 * Optionally filtered by club_id and section_id.
 * GlobalRolesGuard (admin, coordinator)
 */
export async function listMemberRankings(
  query: MemberRankingsQuery,
): Promise<MemberRankingsListResult> {
  const params: Record<string, string | number | boolean | undefined> = {
    year_id: query.year_id,
  };

  if (query.club_id) params.club_id = query.club_id;
  if (query.section_id) params.section_id = query.section_id;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  try {
    const payload = await apiRequest<unknown>("/member-rankings", { params });
    const raw = extractItemArray(payload);
    const items = raw
      .map((item) => normalizeMemberRankingItem(item))
      .filter((item): item is MemberRankingItem => Boolean(item));

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
