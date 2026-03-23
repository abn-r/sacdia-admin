import { apiRequest, apiRequestFromClient, ApiError } from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type InvestitureStatus =
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_VALIDATION"
  | "APPROVED"
  | "REJECTED"
  | "INVESTIDO";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnrollmentUser = {
  user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  email?: string | null;
  photo?: string | null;
};

export type EnrollmentClass = {
  class_id?: number | null;
  name?: string | null;
};

export type EnrollmentEcclesiasticalYear = {
  ecclesiastical_year_id?: number | null;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type Enrollment = {
  enrollment_id: number;
  user_id?: string | null;
  class_id?: number | null;
  ecclesiastical_year_id?: number | null;
  enrollment_date?: string | null;
  investiture_status: InvestitureStatus;
  submitted_for_validation?: boolean | null;
  submitted_at?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
  rejection_reason?: string | null;
  investiture_date?: string | null;
  advanced_status?: boolean | null;
  locked_for_validation?: boolean | null;
  cross_type_enrollment?: boolean | null;
  active?: boolean;
  // Nested relations (from pending investiture endpoint)
  user?: EnrollmentUser | null;
  class?: EnrollmentClass | null;
  ecclesiastical_year?: EnrollmentEcclesiasticalYear | null;
  // Also from classes controller format
  classes?: EnrollmentClass | null;
};

export type EnrollmentsQuery = {
  status?: InvestitureStatus | "all";
  search?: string;
  ecclesiastical_year_id?: number;
  local_field_id?: number;
  class_id?: number;
  page?: number;
  limit?: number;
};

export type EnrollmentsListResult = {
  items: Enrollment[];
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
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0) return false;
  return null;
}

function normalizeStatus(value: unknown): InvestitureStatus {
  const s = pickString(value);
  const valid: InvestitureStatus[] = [
    "IN_PROGRESS",
    "SUBMITTED_FOR_VALIDATION",
    "APPROVED",
    "REJECTED",
    "INVESTIDO",
  ];
  return valid.includes(s as InvestitureStatus) ? (s as InvestitureStatus) : "IN_PROGRESS";
}

function normalizeEnrollmentUser(value: unknown): EnrollmentUser | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    user_id: pickString(r.user_id),
    first_name: pickString(r.first_name) ?? pickString(r.name),
    last_name: pickString(r.last_name) ?? pickString(r.paternal_last_name),
    name: pickString(r.name),
    paternal_last_name: pickString(r.paternal_last_name),
    maternal_last_name: pickString(r.maternal_last_name),
    email: pickString(r.email),
    photo: pickString(r.photo) ?? pickString(r.user_image) ?? pickString(r.picture_url),
  };
}

function normalizeEnrollmentClass(value: unknown): EnrollmentClass | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    class_id: pickNumber(r.class_id),
    name: pickString(r.name),
  };
}

function normalizeEcclesiasticalYear(value: unknown): EnrollmentEcclesiasticalYear | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    ecclesiastical_year_id:
      pickNumber(r.ecclesiastical_year_id) ?? pickNumber(r.year_id),
    name: pickString(r.name),
    start_date: pickString(r.start_date),
    end_date: pickString(r.end_date),
  };
}

function normalizeEnrollment(item: GenericRecord): Enrollment | null {
  const id = pickNumber(item.enrollment_id);
  if (id === null) return null;

  return {
    enrollment_id: id,
    user_id: pickString(item.user_id),
    class_id: pickNumber(item.class_id),
    ecclesiastical_year_id: pickNumber(item.ecclesiastical_year_id),
    enrollment_date: pickString(item.enrollment_date),
    investiture_status: normalizeStatus(item.investiture_status),
    submitted_for_validation: pickBoolean(item.submitted_for_validation),
    submitted_at: pickString(item.submitted_at),
    validated_by: pickString(item.validated_by),
    validated_at: pickString(item.validated_at),
    rejection_reason: pickString(item.rejection_reason),
    investiture_date: pickString(item.investiture_date),
    advanced_status: pickBoolean(item.advanced_status),
    locked_for_validation: pickBoolean(item.locked_for_validation),
    cross_type_enrollment: pickBoolean(item.cross_type_enrollment),
    active: pickBoolean(item.active) ?? true,
    user: normalizeEnrollmentUser(item.user ?? item.users),
    class: normalizeEnrollmentClass(item.class ?? item.classes),
    ecclesiastical_year: normalizeEcclesiasticalYear(item.ecclesiastical_year),
  };
}

function extractEnrollmentArray(payload: unknown): GenericRecord[] {
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

function normalizeEnrollmentListMeta(payload: unknown): {
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

function normalizeEndpointState(error: ApiError): EnrollmentsListResult["endpointState"] {
  if (error.status === 401 || error.status === 403) return "forbidden";
  if (error.status === 429) return "rate-limited";
  return "missing";
}

function normalizeEndpointDetail(error: ApiError): string {
  if (error.status === 401) return "Sesion expirada o token invalido.";
  if (error.status === 403) return "Tu rol no tiene permisos para ver inscripciones.";
  if (error.status === 429) return "Demasiadas solicitudes. Reintenta en unos segundos.";
  if (error.status >= 500) return "El backend no esta disponible temporalmente.";
  return "Endpoint no disponible en backend.";
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/investiture/pending
 * Fetches enrollments that are in SUBMITTED_FOR_VALIDATION status.
 * This is the primary admin enrollment listing endpoint available in the backend.
 * GlobalRolesGuard (admin, coordinator)
 */
export async function listEnrollments(
  query: EnrollmentsQuery = {},
): Promise<EnrollmentsListResult> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (query.ecclesiastical_year_id) {
    params.ecclesiastical_year_id = query.ecclesiastical_year_id;
  }
  if (query.local_field_id) {
    params.local_field_id = query.local_field_id;
  }
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  try {
    const payload = await apiRequest<unknown>("/investiture/pending", { params });
    const raw = extractEnrollmentArray(payload);
    const items = raw
      .map((item) => normalizeEnrollment(item))
      .filter((item): item is Enrollment => Boolean(item));

    // Apply client-side search filter if provided
    const searchLower = query.search?.trim().toLowerCase();
    const filtered = searchLower
      ? items.filter((enrollment) => {
          const user = enrollment.user;
          const fullName = [
            user?.first_name,
            user?.name,
            user?.last_name,
            user?.paternal_last_name,
            user?.maternal_last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const email = (user?.email ?? "").toLowerCase();
          return fullName.includes(searchLower) || email.includes(searchLower);
        })
      : items;

    const metaRaw = normalizeEnrollmentListMeta(payload);

    return {
      items: filtered,
      ...metaRaw,
      endpointAvailable: true,
      endpointState: "available",
      endpointDetail: `Disponible (${metaRaw.total} inscripciones pendientes de validacion).`,
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
 * POST /api/v1/enrollments/:enrollmentId/validate
 * Approve or reject an enrollment for investiture validation.
 * GlobalRolesGuard (admin, coordinator)
 * Client-side only (mutation)
 */
export async function validateEnrollment(
  enrollmentId: number,
  action: "APPROVED" | "REJECTED",
  comments?: string,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/enrollments/${enrollmentId}/validate`,
    {
      method: "POST",
      body: { action, comments: comments ?? "" },
    },
  );
}
