/**
 * Admin API client for role requirements (today: the counselor «constancia»).
 * Backend: /admin/role-requirements (permission `role_requirements:manage`).
 */
import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type RoleRequirementMode = "INFO" | "WARN" | "BLOCK";

export type RoleRequirement = {
  requirement_id: number;
  role: { role_id: string; name: string };
  club_type: { club_type_id: number; name: string } | null;
  requirement_type: string;
  mode: RoleRequirementMode;
  /** Calendar date YYYY-MM-DD; null means «from now on». */
  effective_from: string | null;
  equivalent_certification: { certification_id: number; name: string } | null;
  active: boolean;
  modified_at: string;
};

export type UpdateRoleRequirementInput = {
  mode?: RoleRequirementMode;
  effective_from?: string | null;
  equivalent_certification_id?: number | null;
};

export const ROLE_REQUIREMENT_MODES: readonly RoleRequirementMode[] = ["INFO", "WARN", "BLOCK"];

export async function listRoleRequirements(): Promise<RoleRequirement[]> {
  const payload = await apiRequest<unknown>("/admin/role-requirements");
  const data = unwrapApiData<{ items?: RoleRequirement[] } | RoleRequirement[]>(payload);
  if (Array.isArray(data)) return data;
  return data?.items ?? [];
}

export async function updateRoleRequirement(
  requirementId: number,
  input: UpdateRoleRequirementInput,
): Promise<RoleRequirement> {
  const payload = await apiRequest<unknown>(`/admin/role-requirements/${requirementId}`, {
    method: "PATCH",
    body: input,
  });
  return unwrapApiData<RoleRequirement>(payload);
}
