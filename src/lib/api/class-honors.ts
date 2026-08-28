/**
 * Admin API client for class-honor relations (`class_honors` table).
 * Backend: GET/POST /admin/classes/:classId/honors,
 * PATCH/DELETE /admin/classes/:classId/honors/:classHonorId.
 *
 * Relation is informative: it does not block module progress or investiture,
 * even for `REQUIRED`. See docs/features/clases-progresivas.md.
 */
import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type ClassHonorRelationType = "REQUIRED" | "RECOMMENDED" | "ELECTIVE";

export interface ClassHonorRelation {
  class_honor_id: number;
  class_id: number;
  honor_id: number;
  module_id?: number | null;
  relation_type: ClassHonorRelationType;
  active: boolean;
  honor: {
    honor_id: number;
    name: string;
    honor_image: string | null;
    material_url?: string | null;
    honors_category_id: number | null;
    skill_level: number | null;
  };
  module?: { module_id: number; name: string } | null;
}

export type CreateClassHonorPayload = {
  honor_id: number;
  relation_type: ClassHonorRelationType;
  module_id?: number | null;
};

export type UpdateClassHonorPayload = {
  module_id?: number | null;
};

export async function getClassHonors(
  classId: number,
  params?: { active?: boolean },
) {
  const payload = await apiRequest<unknown>(`/admin/classes/${classId}/honors`, {
    params,
  });
  return unwrapApiData<ClassHonorRelation[]>(payload);
}

export async function createClassHonor(
  classId: number,
  body: CreateClassHonorPayload,
) {
  const payload = await apiRequest<unknown>(`/admin/classes/${classId}/honors`, {
    method: "POST",
    body,
  });
  return unwrapApiData<ClassHonorRelation>(payload);
}

export async function updateClassHonor(
  classId: number,
  classHonorId: number,
  body: UpdateClassHonorPayload,
) {
  const payload = await apiRequest<unknown>(
    `/admin/classes/${classId}/honors/${classHonorId}`,
    { method: "PATCH", body },
  );
  return unwrapApiData<ClassHonorRelation>(payload);
}

export async function deleteClassHonor(classId: number, classHonorId: number) {
  const payload = await apiRequest<unknown>(
    `/admin/classes/${classId}/honors/${classHonorId}`,
    { method: "DELETE" },
  );
  return unwrapApiData<ClassHonorRelation>(payload);
}
