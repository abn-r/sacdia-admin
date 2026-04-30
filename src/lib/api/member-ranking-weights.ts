import { apiRequest, ApiError } from "@/lib/api/client";

/**
 * Member Ranking Weights API client.
 *
 * Manages the `enrollment_ranking_weights` table — the configurable percentage
 * weights (class / investiture / camporee) used when computing composite scores.
 *
 * FIELD NAME NOTE (plan divergence):
 * The plan spec (Task 14 / D1) refers to `year_id` as the ecclesiastical-year
 * column. The REAL backend DTO (create-member-ranking-weights.dto.ts and
 * member-ranking-weights-response.dto.ts) uses `ecclesiastical_year_id` for
 * BOTH the request payload and the response shape. This client uses
 * `ecclesiastical_year_id` to match the actual backend contract.
 *
 * Route prefix: /api/v1/member-ranking-weights
 * Auth:         JwtAuthGuard + GlobalRolesGuard(admin, super_admin) + PermissionsGuard
 * Permission:   member_ranking_weights:read (GET) / member_ranking_weights:write (POST/PATCH/DELETE)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Response shape returned by all MemberRankingWeights endpoints.
 * Decimal(5,2) fields (class_pct, investiture_pct, camporee_pct) are coerced
 * to plain JS numbers by the backend's `fromRow` helper.
 */
export type EnrollmentRankingWeight = {
  id: string;
  club_type_id: number | null;
  /** Real DB column name. Plan spec mistakenly called it `year_id`. */
  ecclesiastical_year_id: number | null;
  class_pct: number;
  investiture_pct: number;
  camporee_pct: number;
  /**
   * True for the single global default row (NULL, NULL) seeded at migration.
   * This row can be edited but NOT deleted.
   */
  is_default: boolean;
  created_at: string;
  modified_at: string;
};

export type CreateEnrollmentRankingWeightDto = {
  class_pct: number;
  investiture_pct: number;
  camporee_pct: number;
  club_type_id?: number | null;
  /** Real DB column name — see FIELD NAME NOTE above. */
  ecclesiastical_year_id?: number | null;
};

export type UpdateEnrollmentRankingWeightDto = Partial<CreateEnrollmentRankingWeightDto>;

export type WeightsListQuery = {
  page?: number;
  limit?: number;
};

export type WeightsListResult = {
  items: EnrollmentRankingWeight[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  endpointAvailable: boolean;
  endpointState: "available" | "forbidden" | "missing" | "rate-limited";
  endpointDetail: string;
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

function pickBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function normalizeWeightRow(raw: GenericRecord): EnrollmentRankingWeight | null {
  const id = pickString(raw.id);
  const classPct = pickNumber(raw.class_pct);
  const investiturePct = pickNumber(raw.investiture_pct);
  const camporeePct = pickNumber(raw.camporee_pct);
  const createdAt = pickString(raw.created_at);
  const modifiedAt = pickString(raw.modified_at);

  if (
    id === null ||
    classPct === null ||
    investiturePct === null ||
    camporeePct === null ||
    createdAt === null ||
    modifiedAt === null
  ) {
    return null;
  }

  return {
    id,
    club_type_id: pickNumber(raw.club_type_id),
    ecclesiastical_year_id: pickNumber(raw.ecclesiastical_year_id),
    class_pct: classPct,
    investiture_pct: investiturePct,
    camporee_pct: camporeePct,
    is_default: pickBoolean(raw.is_default),
    created_at: createdAt,
    modified_at: modifiedAt,
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
  const candidates: string[][] = [["data", "meta"], ["meta"], ["data"]];

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
  const limit = pickNumber(meta?.limit) ?? 50;
  const total = pickNumber(meta?.total) ?? 0;
  const totalPages =
    pickNumber(meta?.totalPages) ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { total, page, limit, totalPages };
}

function normalizeEndpointState(
  error: ApiError,
): WeightsListResult["endpointState"] {
  if (error.status === 401 || error.status === 403) return "forbidden";
  if (error.status === 429) return "rate-limited";
  return "missing";
}

function normalizeEndpointDetail(error: ApiError): string {
  if (error.status === 401) return "Sesion expirada o token invalido.";
  if (error.status === 403) return "Tu rol no tiene permisos para ver pesos de rankings.";
  if (error.status === 429) return "Demasiadas solicitudes. Reintenta en unos segundos.";
  if (error.status >= 500) return "El backend no esta disponible temporalmente.";
  return "Endpoint no disponible en backend.";
}

// ─── Error code extraction ────────────────────────────────────────────────────

/**
 * Extracts the backend error `code` string from an ApiError payload.
 * Backend shape: `{ statusCode, message, code }` or `{ error, code }`.
 */
export function extractErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const r = asRecord(error.payload);
  if (!r) return null;
  return pickString(r.code);
}

/**
 * Maps backend error codes to user-facing Spanish messages (D6).
 * Falls back to the raw ApiError message if code is unrecognised.
 */
export function mapWeightsErrorMessage(error: unknown): string {
  const code = extractErrorCode(error);

  switch (code) {
    case "WEIGHTS_SUM_INVALID": {
      // Backend interpolates {sum} in the i18n message — extract from payload if available
      const r = asRecord((error as ApiError).payload);
      const args = asRecord(r?.namedArgs);
      const sum = args ? pickNumber(args.sum) : null;
      return sum !== null
        ? `La suma debe ser 100 (recibido ${sum})`
        : "La suma de los porcentajes debe ser 100";
    }
    case "WEIGHTS_CONFLICT":
      return "Ya existe configuracion para este tipo de club y ano";
    case "DEFAULT_WEIGHTS_NOT_DELETABLE":
      return "No se puede eliminar la configuracion por defecto";
    case "WEIGHTS_NOT_FOUND":
      return "Configuracion no encontrada";
    default:
      if (error instanceof ApiError) return error.message;
      if (error instanceof Error) return error.message;
      return "Error desconocido";
  }
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/member-ranking-weights
 * Paginated list ordered by is_default DESC (default row first, then overrides).
 */
export async function listMemberRankingWeights(
  query?: WeightsListQuery,
): Promise<WeightsListResult> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query?.page) params.page = query.page;
  if (query?.limit) params.limit = query.limit;

  try {
    const payload = await apiRequest<unknown>("/member-ranking-weights", { params });
    const raw = extractItemArray(payload);
    const items = raw
      .map((item) => normalizeWeightRow(item))
      .filter((item): item is EnrollmentRankingWeight => Boolean(item));

    const metaRaw = normalizeListMeta(payload);

    return {
      items,
      ...metaRaw,
      endpointAvailable: true,
      endpointState: "available",
      endpointDetail: `Disponible (${metaRaw.total} configuraciones).`,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
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
 * GET /api/v1/member-ranking-weights/:id
 * Returns a single weight configuration by UUID.
 * Throws ApiError — caller handles 404.
 */
export async function getMemberRankingWeights(
  id: string,
): Promise<EnrollmentRankingWeight> {
  const payload = await apiRequest<unknown>(`/member-ranking-weights/${id}`);
  const r = asRecord(payload);
  if (!r) {
    throw new ApiError("Respuesta inesperada del servidor", 500, payload);
  }

  // Backend may wrap in { data: {...} }
  const row = asRecord(r.data) ?? r;
  const normalized = normalizeWeightRow(row);
  if (!normalized) {
    throw new ApiError("No se pudo normalizar la configuracion de pesos", 500, payload);
  }

  return normalized;
}

/**
 * POST /api/v1/member-ranking-weights
 * Creates a new weight configuration.
 * Backend validates class_pct + investiture_pct + camporee_pct = 100 (±0.01).
 * Unique constraint: (club_type_id, ecclesiastical_year_id).
 * Throws ApiError — caller maps via mapWeightsErrorMessage().
 */
export async function createMemberRankingWeights(
  dto: CreateEnrollmentRankingWeightDto,
): Promise<EnrollmentRankingWeight> {
  const payload = await apiRequest<unknown>("/member-ranking-weights", {
    method: "POST",
    body: dto,
  });
  const r = asRecord(payload);
  if (!r) {
    throw new ApiError("Respuesta inesperada del servidor", 500, payload);
  }

  const row = asRecord(r.data) ?? r;
  const normalized = normalizeWeightRow(row);
  if (!normalized) {
    throw new ApiError("No se pudo normalizar la respuesta creada", 500, payload);
  }

  return normalized;
}

/**
 * PATCH /api/v1/member-ranking-weights/:id
 * Partially updates a weight configuration.
 * Backend merges provided fields with existing values and re-validates sum.
 * Throws ApiError — caller maps via mapWeightsErrorMessage().
 */
export async function updateMemberRankingWeights(
  id: string,
  dto: UpdateEnrollmentRankingWeightDto,
): Promise<EnrollmentRankingWeight> {
  const payload = await apiRequest<unknown>(`/member-ranking-weights/${id}`, {
    method: "PATCH",
    body: dto,
  });
  const r = asRecord(payload);
  if (!r) {
    throw new ApiError("Respuesta inesperada del servidor", 500, payload);
  }

  const row = asRecord(r.data) ?? r;
  const normalized = normalizeWeightRow(row);
  if (!normalized) {
    throw new ApiError("No se pudo normalizar la respuesta actualizada", 500, payload);
  }

  return normalized;
}

/**
 * DELETE /api/v1/member-ranking-weights/:id
 * Deletes a weight configuration.
 * The global default row (is_default=true) cannot be deleted — backend returns 400.
 * Throws ApiError — caller maps via mapWeightsErrorMessage().
 */
export async function deleteMemberRankingWeights(id: string): Promise<void> {
  await apiRequest<unknown>(`/member-ranking-weights/${id}`, {
    method: "DELETE",
  });
}
