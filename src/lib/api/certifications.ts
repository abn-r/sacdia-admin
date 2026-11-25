import { apiRequest } from "@/lib/api/client";

// ─── Public / operational types ────────────────────────────────────────────
//
// NOTE: `certification_modules`/`certification_sections` use `name` in the
// real backend contract (Prisma models + admin DTOs), not `title`. Only
// `certification_versions` has a `title` field. These types previously
// declared `title`/`order`/`is_required`, which never matched the backend —
// `catalog-normalize.ts` already mitigated this with `title ?? name` lookups.
// See docs/api/ENDPOINTS-LIVE-REFERENCE.md (certifications) in the sacdia workspace.

export type CertificationSection = {
  section_id: number;
  name: string;
  description?: string | null;
  sort_order?: number | null;
  required?: boolean;
};

export type CertificationModule = {
  module_id: number;
  name: string;
  description?: string | null;
  sort_order?: number | null;
  sections: CertificationSection[];
};

export type Certification = {
  certification_id: number;
  name: string;
  description?: string | null;
  duration_weeks?: number | null;
  active?: boolean;
  modules?: CertificationModule[];
  modules_count?: number;
};

export type CertificationListQuery = {
  page?: number;
  limit?: number;
};

export type UserCertificationEnrollment = {
  enrollment_id?: number;
  user_id: string;
  certification_id: number;
  enrolled_at?: string | null;
  completed_at?: string | null;
  progress_percent?: number | null;
  certification?: Pick<Certification, "certification_id" | "name" | "description">;
  user?: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    photo?: string | null;
  };
};

export type SectionProgress = {
  section_id: number;
  title?: string;
  completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
};

export type ModuleProgress = {
  module_id: number;
  title?: string;
  sections: SectionProgress[];
};

export type UserCertificationProgress = {
  user_id: string;
  certification_id: number;
  enrolled_at?: string | null;
  completed_at?: string | null;
  progress_percent?: number | null;
  modules: ModuleProgress[];
};

export type UpdateSectionProgressPayload = {
  section_id: number;
  completed: boolean;
  notes?: string;
};

// ─── Public API functions ───────────────────────────────────────────────────

export async function listCertifications(query: CertificationListQuery = {}) {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (typeof query.page === "number" && query.page > 0) params.page = query.page;
  if (typeof query.limit === "number" && query.limit > 0) params.limit = query.limit;

  return apiRequest<unknown>("/certifications/certifications", { params });
}

export async function getCertificationById(certificationId: number) {
  return apiRequest<unknown>(`/certifications/certifications/${certificationId}`);
}

export async function getUserCertifications(userId: string) {
  return apiRequest<unknown>(`/certifications/users/${encodeURIComponent(userId)}/certifications`);
}

export async function getUserCertificationProgress(userId: string, certificationId: number) {
  return apiRequest<unknown>(
    `/certifications/users/${encodeURIComponent(userId)}/certifications/${certificationId}/progress`,
  );
}

export async function updateUserCertificationProgress(
  userId: string,
  certificationId: number,
  payload: UpdateSectionProgressPayload,
) {
  return apiRequest<unknown>(
    `/certifications/users/${encodeURIComponent(userId)}/certifications/${certificationId}/progress`,
    { method: "PATCH", body: payload },
  );
}

export async function enrollUserInCertification(
  userId: string,
  certificationId: number,
) {
  return apiRequest<unknown>(
    `/certifications/users/${encodeURIComponent(userId)}/certifications/enroll`,
    { method: "POST", body: { certification_id: certificationId } },
  );
}

export async function unenrollUserFromCertification(
  userId: string,
  certificationId: number,
) {
  return apiRequest<unknown>(
    `/certifications/users/${encodeURIComponent(userId)}/certifications/${certificationId}`,
    { method: "DELETE" },
  );
}

// ─── Enrollments by certification (backend contract B2) ──────────────────────
//
// GET /certifications/certifications/:id/enrollments?page=&limit=&search=&status= (B2)
// Pending deploy: until the endpoint exists the call fails with a 404 and the
// "Inscritos" tab renders an ErrorState (never an empty list).

export type CertificationEnrollmentRow = {
  enrollment_id: number;
  user_id: string;
  name: string;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  club_name: string | null;
  section_name: string | null;
  /** certification_enrollment_status_enum */
  status: string;
  progress_percent: number;
  enrollment_date: string;
};

export type CertificationEnrollmentsPage = {
  items: CertificationEnrollmentRow[];
  total: number;
  page: number;
  limit: number;
};

export type CertificationEnrollmentsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

type EnrollmentRecord = Record<string, unknown>;

function enrollmentText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function enrollmentNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Reads the B2 envelope (`{ data: { items, total, page, limit } }`, or the bare data). */
export function normalizeCertificationEnrollmentsPage(
  payload: unknown,
  fallback: { page: number; limit: number } = { page: 1, limit: 20 },
): CertificationEnrollmentsPage {
  const root = (payload && typeof payload === "object" ? payload : {}) as EnrollmentRecord;
  const data = (
    root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : root
  ) as EnrollmentRecord;
  const rawItems = Array.isArray(data.items) ? data.items : [];

  const items = rawItems.flatMap((entry): CertificationEnrollmentRow[] => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as EnrollmentRecord;
    const userId = enrollmentText(row.user_id);
    if (!userId) return [];
    return [
      {
        enrollment_id: enrollmentNumber(row.enrollment_id, 0),
        user_id: userId,
        name: enrollmentText(row.name) ?? "",
        paternal_last_name: enrollmentText(row.paternal_last_name),
        maternal_last_name: enrollmentText(row.maternal_last_name),
        club_name: enrollmentText(row.club_name),
        section_name: enrollmentText(row.section_name),
        status: enrollmentText(row.status) ?? "ENROLLED",
        progress_percent: Math.min(100, Math.max(0, enrollmentNumber(row.progress_percent, 0))),
        enrollment_date: enrollmentText(row.enrollment_date) ?? "",
      },
    ];
  });

  return {
    items,
    total: Math.max(0, enrollmentNumber(data.total, items.length)),
    page: Math.max(1, enrollmentNumber(data.page, fallback.page)),
    limit: Math.max(1, enrollmentNumber(data.limit, fallback.limit)),
  };
}

export async function listCertificationEnrollments(
  certificationId: number,
  params: CertificationEnrollmentsParams = {},
): Promise<CertificationEnrollmentsPage> {
  const query: Record<string, string | number | boolean | undefined> = {};
  const page = typeof params.page === "number" && params.page > 0 ? params.page : 1;
  const limit = typeof params.limit === "number" && params.limit > 0 ? params.limit : 20;
  query.page = page;
  query.limit = limit;
  const search = params.search?.trim();
  if (search) query.search = search;
  if (params.status) query.status = params.status;

  const payload = await apiRequest<unknown>(`/certifications/certifications/${certificationId}/enrollments`, {
    params: query,
  });
  return normalizeCertificationEnrollmentsPage(payload, { page, limit });
}

// ─── Admin engine types ──────────────────────────────────────────────────────
//
// Aligned to sacdia-backend `feat/configurable-certifications`,
// src/certifications/controllers/admin-certifications.controller.ts and DTOs
// under src/certifications/dto/admin/*. See the API reference for the full contract
// (endpoints, permissions, error codes, state machine, publish criteria):
// docs/api/ENDPOINTS-LIVE-REFERENCE.md (certifications) in the sacdia workspace

export type CertificationVersionStatus = "DRAFT" | "PUBLISHED" | "RETIRED";

export type CertificationComponentType =
  | "TEXT_RESPONSE"
  | "FILE_EVIDENCE"
  | "LINKED_HONOR"
  | "LINKED_ACTIVITY"
  | "ATTESTATION"
  | "AUTO_VALIDATION";

export const CERTIFICATION_COMPONENT_TYPES: CertificationComponentType[] = [
  "TEXT_RESPONSE",
  "FILE_EVIDENCE",
  "LINKED_HONOR",
  "LINKED_ACTIVITY",
  "ATTESTATION",
  "AUTO_VALIDATION",
];

export type CertificationEligibilityRuleType =
  | "MIN_AGE"
  | "BAPTIZED"
  | "INVESTED_CLASS"
  | "ACTIVE_CLUB_TYPE"
  | "ACTIVE_ROLE";

export const CERTIFICATION_ELIGIBILITY_RULE_TYPES: CertificationEligibilityRuleType[] = [
  "MIN_AGE",
  "BAPTIZED",
  "INVESTED_CLASS",
  "ACTIVE_CLUB_TYPE",
  "ACTIVE_ROLE",
];

export type AdminCertificationRequirementComponent = {
  component_id?: number;
  section_id?: number;
  component_type: CertificationComponentType;
  label: string;
  instructions?: string | null;
  configuration?: Record<string, unknown>;
  sort_order?: number;
  required?: boolean;
  honor_id?: number | null;
  activity_type_id?: number | null;
};

export type AdminCertificationSection = {
  section_id?: number;
  module_id?: number;
  name: string;
  description?: string | null;
  instructions?: string | null;
  sort_order?: number;
  required?: boolean;
  certification_requirement_components: AdminCertificationRequirementComponent[];
};

export type AdminCertificationModule = {
  module_id?: number;
  certification_id?: number;
  certification_version_id?: number;
  name: string;
  description?: string | null;
  sort_order?: number;
  certification_sections: AdminCertificationSection[];
};

export type AdminEligibilityRule = {
  eligibility_rule_id?: number;
  certification_version_id?: number;
  rule_type: CertificationEligibilityRuleType;
  configuration?: Record<string, unknown>;
  class_id?: number | null;
  club_type_id?: number | null;
  role_id?: string | null;
  sort_order?: number;
};

export type AdminCertificationVersion = {
  certification_version_id: number;
  certification_id: number;
  version_number: number;
  status: CertificationVersionStatus;
  title?: string | null;
  description?: string | null;
  min_duration_months?: number | null;
  max_duration_months?: number | null;
  published_at?: string | null;
  retired_at?: string | null;
  published_by_id?: string | null;
};

export type AdminCertification = {
  certification_id: number;
  name: string;
  description?: string | null;
  active?: boolean;
};

export type CreateCertificationResult = {
  certification: AdminCertification;
  version: AdminCertificationVersion;
};

/** Version summary returned by GET /admin/certifications. */
export type AdminCertificationVersionSummary = {
  certification_version_id: number;
  version_number: number;
  status: CertificationVersionStatus;
  title?: string | null;
  published_at?: string | null;
  retired_at?: string | null;
  created_at?: string;
  modified_at?: string;
};

export type AdminCertificationListItem = AdminCertification & {
  certification_versions: AdminCertificationVersionSummary[];
};

/**
 * Full version tree returned by
 * GET /admin/certifications/:certificationId/versions/:versionId —
 * version metadata plus ordered eligibility rules and modules → sections →
 * components (each component with its `configuration`).
 */
export type AdminCertificationVersionDetail = AdminCertificationVersion & {
  certification_eligibility_rules: AdminEligibilityRule[];
  certification_modules: AdminCertificationModule[];
};

export type UpsertEligibilityRuleInput = {
  rule_type: CertificationEligibilityRuleType;
  configuration?: Record<string, unknown>;
  class_id?: number | null;
  club_type_id?: number | null;
  role_id?: string | null;
  sort_order?: number;
};

export type UpsertComponentInput = {
  component_type: CertificationComponentType;
  label: string;
  instructions?: string | null;
  configuration?: Record<string, unknown>;
  sort_order?: number;
  required?: boolean;
  honor_id?: number | null;
  activity_type_id?: number | null;
};

export type UpsertSectionInput = {
  name: string;
  description?: string | null;
  instructions?: string | null;
  sort_order?: number;
  required?: boolean;
  components: UpsertComponentInput[];
};

export type UpsertModuleInput = {
  name: string;
  description?: string | null;
  sort_order?: number;
  sections: UpsertSectionInput[];
};

// ─── Admin engine API functions ─────────────────────────────────────────────

export async function listAdminCertifications() {
  return apiRequest<AdminCertificationListItem[]>("/admin/certifications");
}

export async function getCertificationVersionDetail(
  certificationId: number,
  versionId: number,
) {
  return apiRequest<AdminCertificationVersionDetail>(
    `/admin/certifications/${certificationId}/versions/${versionId}`,
  );
}

export async function createCertification(payload: {
  name: string;
  description?: string;
}) {
  return apiRequest<CreateCertificationResult>("/admin/certifications", {
    method: "POST",
    body: payload,
  });
}

export async function createDraftVersion(certificationId: number) {
  return apiRequest<AdminCertificationVersion>(
    `/admin/certifications/${certificationId}/versions`,
    { method: "POST" },
  );
}

export async function cloneCertificationVersion(
  certificationId: number,
  versionId: number,
) {
  return apiRequest<AdminCertificationVersion>(
    `/admin/certifications/${certificationId}/versions/${versionId}/clone`,
    { method: "POST" },
  );
}

export async function updateVersionMetadata(
  certificationId: number,
  versionId: number,
  payload: {
    title?: string;
    description?: string;
    min_duration_months?: number;
    max_duration_months?: number;
  },
) {
  return apiRequest<AdminCertificationVersion>(
    `/admin/certifications/${certificationId}/versions/${versionId}`,
    { method: "PATCH", body: payload },
  );
}

export async function replaceEligibilityRules(
  certificationId: number,
  versionId: number,
  rules: UpsertEligibilityRuleInput[],
) {
  return apiRequest<AdminEligibilityRule[]>(
    `/admin/certifications/${certificationId}/versions/${versionId}/eligibility-rules`,
    { method: "PATCH", body: { rules } },
  );
}

export async function replaceCertificationTree(
  certificationId: number,
  versionId: number,
  modules: UpsertModuleInput[],
) {
  return apiRequest<AdminCertificationModule[]>(
    `/admin/certifications/${certificationId}/versions/${versionId}/tree`,
    { method: "PATCH", body: { modules } },
  );
}

export async function publishCertificationVersion(
  certificationId: number,
  versionId: number,
) {
  return apiRequest<AdminCertificationVersion>(
    `/admin/certifications/${certificationId}/versions/${versionId}/publish`,
    { method: "POST" },
  );
}

export async function retireCertificationVersion(
  certificationId: number,
  versionId: number,
) {
  return apiRequest<AdminCertificationVersion>(
    `/admin/certifications/${certificationId}/versions/${versionId}/publish`,
    { method: "DELETE" },
  );
}
