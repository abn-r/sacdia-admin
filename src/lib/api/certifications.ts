import { apiRequest } from "@/lib/api/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CertificationSection = {
  section_id: number;
  title: string;
  description?: string | null;
  order?: number | null;
  is_required?: boolean;
};

export type CertificationModule = {
  module_id: number;
  title: string;
  description?: string | null;
  order?: number | null;
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

// ─── API functions ────────────────────────────────────────────────────────────

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
