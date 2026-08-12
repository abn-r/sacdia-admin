/**
 * Admin API client for explicit class prerequisites (`class_prerequisites` table).
 * Backend: GET/POST /admin/classes/:classId/prerequisites,
 * DELETE /admin/classes/:classId/prerequisites/:prerequisiteId.
 *
 * `requires_invested_gm` keeps working independently; this table is additive.
 * See docs/features/clases-progresivas-analisis-integral.md.
 */
import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export interface ClassPrerequisiteRelation {
  class_prerequisite_id: number;
  class_id: number;
  prerequisite_class_id: number;
  active: boolean;
  prerequisite: {
    class_id: number;
    name: string;
    active: boolean;
  };
}

export type CreateClassPrerequisitePayload = {
  prerequisite_class_id: number;
};

export async function getClassPrerequisites(
  classId: number,
  params?: { active?: boolean },
) {
  const payload = await apiRequest<unknown>(
    `/admin/classes/${classId}/prerequisites`,
    { params },
  );
  return unwrapApiData<ClassPrerequisiteRelation[]>(payload);
}

export async function createClassPrerequisite(
  classId: number,
  body: CreateClassPrerequisitePayload,
) {
  const payload = await apiRequest<unknown>(
    `/admin/classes/${classId}/prerequisites`,
    { method: "POST", body },
  );
  return unwrapApiData<ClassPrerequisiteRelation>(payload);
}

export async function deleteClassPrerequisite(
  classId: number,
  prerequisiteId: number,
) {
  const payload = await apiRequest<unknown>(
    `/admin/classes/${classId}/prerequisites/${prerequisiteId}`,
    { method: "DELETE" },
  );
  return unwrapApiData<ClassPrerequisiteRelation>(payload);
}
