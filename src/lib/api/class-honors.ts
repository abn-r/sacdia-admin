/**
 * Admin API client for class-honor relations (`class_honors` table).
 * Backend: GET/POST /admin/classes/:classId/honors,
 * DELETE /admin/classes/:classId/honors/:classHonorId.
 *
 * Relation is informative in this phase: it does not block investiture,
 * even for `REQUIRED`. See docs/features/clases-progresivas-analisis-integral.md.
 */
import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type ClassHonorRelationType = "REQUIRED" | "RECOMMENDED" | "ELECTIVE";

export interface ClassHonorRelation {
  class_honor_id: number;
  class_id: number;
  honor_id: number;
  relation_type: ClassHonorRelationType;
  active: boolean;
  honor: {
    honor_id: number;
    name: string;
    honor_image: string | null;
    honors_category_id: number | null;
    skill_level: number | null;
  };
}

export type CreateClassHonorPayload = {
  honor_id: number;
  relation_type: ClassHonorRelationType;
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

export async function deleteClassHonor(classId: number, classHonorId: number) {
  const payload = await apiRequest<unknown>(
    `/admin/classes/${classId}/honors/${classHonorId}`,
    { method: "DELETE" },
  );
  return unwrapApiData<ClassHonorRelation>(payload);
}
