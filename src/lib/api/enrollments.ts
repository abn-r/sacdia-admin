import { apiRequest, apiRequestFromClient, ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnrollmentStatus =
  | "pending_validation"
  | "active"
  | "rejected"
  | "inactive";

export type EnrollmentPerson = {
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
};

export type EnrollmentClub = {
  club_id?: number | null;
  name?: string | null;
};

export type EnrollmentSection = {
  section_id?: number | null;
  name?: string | null;
  club_type_id?: number | null;
  club_type_name?: string | null;
};

export type EnrollmentLocalField = {
  local_field_id?: number | null;
  name?: string | null;
};

export type EnrollmentEcclesiasticalYear = {
  ecclesiastical_year_id?: number | null;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type Enrollment = {
  club_enrollment_id: string;
  club_section_id?: number | null;
  ecclesiastical_year_id?: number | null;
  status: EnrollmentStatus;
  address?: string | null;
  meeting_days?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
  club?: EnrollmentClub | null;
  section?: EnrollmentSection | null;
  local_field?: EnrollmentLocalField | null;
  ecclesiastical_year?: EnrollmentEcclesiasticalYear | null;
  created_by?: EnrollmentPerson | null;
  director?: EnrollmentPerson | null;
  secretary?: EnrollmentPerson | null;
  treasurer?: EnrollmentPerson | null;
  secretary_treasurer?: EnrollmentPerson | null;
};

export type EnrollmentsQuery = {
  status?: EnrollmentStatus | "all";
  search?: string;
  ecclesiastical_year_id?: number;
  local_field_id?: number;
  club_type_id?: number;
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

function normalizeStatus(value: unknown): EnrollmentStatus {
  const status = pickString(value) as EnrollmentStatus | null;
  const valid: EnrollmentStatus[] = [
    "pending_validation",
    "active",
    "rejected",
    "inactive",
  ];
  return status && valid.includes(status) ? status : "pending_validation";
}

function resolveFullName(value: GenericRecord | null): string | null {
  if (!value) return null;
  const parts = [
    pickString(value.name),
    pickString(value.paternal_last_name),
    pickString(value.maternal_last_name),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : pickString(value.email);
}

function normalizePerson(value: unknown): EnrollmentPerson | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    user_id: pickString(record.user_id),
    name: resolveFullName(record),
    email: pickString(record.email),
  };
}

function normalizeEcclesiasticalYear(
  value: unknown,
): EnrollmentEcclesiasticalYear | null {
  const record = asRecord(value);
  if (!record) return null;
  const id =
    pickNumber(record.ecclesiastical_year_id) ?? pickNumber(record.year_id);
  const start = pickString(record.start_date);
  const end = pickString(record.end_date);
  return {
    ecclesiastical_year_id: id,
    name:
      pickString(record.name) ??
      (start && end ? `${start.slice(0, 4)}-${end.slice(0, 4)}` : null),
    start_date: start,
    end_date: end,
  };
}

function normalizeEnrollment(item: GenericRecord): Enrollment | null {
  const id = pickString(item.club_enrollment_id);
  if (!id) return null;

  const section = asRecord(item.club_section);
  const club = asRecord(section?.clubs ?? section?.club);
  const clubType = asRecord(section?.club_types ?? section?.club_type);
  const localField = asRecord(club?.local_fields ?? club?.local_field);
  const sectionName =
    pickString(section?.name) ?? pickString(clubType?.name) ?? "Sección";

  return {
    club_enrollment_id: id,
    club_section_id:
      pickNumber(item.club_section_id) ?? pickNumber(section?.club_section_id),
    ecclesiastical_year_id: pickNumber(item.ecclesiastical_year_id),
    status: normalizeStatus(item.status),
    address: pickString(item.address),
    meeting_days: pickString(item.meeting_days),
    created_at: pickString(item.created_at),
    modified_at: pickString(item.modified_at),
    club: {
      club_id: pickNumber(club?.club_id),
      name: pickString(club?.name),
    },
    section: {
      section_id: pickNumber(section?.club_section_id),
      name: sectionName,
      club_type_id:
        pickNumber(section?.club_type_id) ?? pickNumber(clubType?.club_type_id),
      club_type_name: pickString(clubType?.name),
    },
    local_field: {
      local_field_id: pickNumber(localField?.local_field_id),
      name: pickString(localField?.name),
    },
    ecclesiastical_year: normalizeEcclesiasticalYear(item.ecclesiastical_year),
    created_by: normalizePerson(item.creator ?? item.created_by),
    director: normalizePerson(item.director),
    secretary: normalizePerson(item.secretary),
    treasurer: normalizePerson(item.treasurer),
    secretary_treasurer: normalizePerson(item.secretary_treasurer),
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
    for (const key of path) current = asRecord(current)?.[key];
    if (Array.isArray(current)) {
      return current.filter((value): value is GenericRecord =>
        Boolean(asRecord(value)),
      );
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
  const candidates: string[][] = [["data", "meta"], ["meta"], ["data"]];
  let meta: GenericRecord | null = null;

  for (const path of candidates) {
    let current: unknown = payload;
    for (const key of path) current = asRecord(current)?.[key];
    const record = asRecord(current);
    if (
      record &&
      (pickNumber(record.total) !== null ||
        pickNumber(record.totalPages) !== null)
    ) {
      meta = record;
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

function normalizeEndpointState(
  error: ApiError,
): EnrollmentsListResult["endpointState"] {
  if (error.status === 401 || error.status === 403) return "forbidden";
  if (error.status === 429) return "rate-limited";
  return "missing";
}

function normalizeEndpointDetail(error: ApiError): string {
  if (error.status === 401) return "Sesión expirada o token inválido.";
  if (error.status === 403)
    return "Tu rol no tiene permisos para validar inscripciones anuales de clubes.";
  if (error.status === 429)
    return "Demasiadas solicitudes. Reintenta en unos segundos.";
  if (error.status >= 500)
    return "El backend no está disponible temporalmente.";
  return "Endpoint no disponible en backend.";
}

// ─── API functions ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/club-enrollments/validation/queue
 * Lists annual club enrollments awaiting Campo Local validation.
 */
export async function listEnrollments(
  query: EnrollmentsQuery = {},
): Promise<EnrollmentsListResult> {
  const params: Record<string, string | number | undefined> = {};

  if (query.status) params.status = query.status;
  if (query.ecclesiastical_year_id)
    params.ecclesiastical_year_id = query.ecclesiastical_year_id;
  if (query.local_field_id) params.local_field_id = query.local_field_id;
  if (query.club_type_id) params.club_type_id = query.club_type_id;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;

  try {
    const payload = await apiRequest<unknown>(
      "/club-enrollments/validation/queue",
      { params },
    );
    const raw = extractEnrollmentArray(payload);
    const items = raw
      .map((item) => normalizeEnrollment(item))
      .filter((item): item is Enrollment => Boolean(item));

    const searchLower = query.search?.trim().toLowerCase();
    const filtered = searchLower
      ? items.filter((enrollment) => {
          const values = [
            enrollment.club?.name,
            enrollment.section?.name,
            enrollment.section?.club_type_name,
            enrollment.local_field?.name,
            enrollment.created_by?.name,
            enrollment.created_by?.email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return values.includes(searchLower);
        })
      : items;

    const metaRaw = normalizeEnrollmentListMeta(payload);

    return {
      items: filtered,
      ...metaRaw,
      endpointAvailable: true,
      endpointState: "available",
      endpointDetail: `Disponible (${metaRaw.total} inscripciones anuales pendientes).`,
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

export async function approveEnrollment(
  enrollmentId: string,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/club-enrollments/${enrollmentId}/approve`,
    { method: "POST" },
  );
}

export async function rejectEnrollment(enrollmentId: string): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/club-enrollments/${enrollmentId}/reject`,
    { method: "POST" },
  );
}
