import { apiRequest } from "@/lib/api/client";

export type CamporeeStaffScope = "local" | "union";

export type CamporeeStaffCategory =
  | "judge"
  | "administrative"
  | "kitchen"
  | "support"
  | "spiritual"
  | "leadership"
  | "other";

export const CAMPOREE_STAFF_CATEGORIES: CamporeeStaffCategory[] = [
  "judge",
  "administrative",
  "kitchen",
  "support",
  "spiritual",
  "leadership",
  "other",
];

export type CamporeeStaffUserSummary = {
  user_id: string;
  email: string | null;
  name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  full_name: string;
  user_image: string | null;
  active: boolean;
  access_app: boolean;
  access_panel: boolean;
  union?: { union_id: number | null; name: string | null } | null;
  local_field?: {
    local_field_id: number | null;
    union_id: number | null;
    name: string | null;
  } | null;
};

export type CamporeeStaffMember = {
  camporee_staff_member_id: string;
  local_camporee_id: number | null;
  union_camporee_id: number | null;
  user_id: string;
  category: CamporeeStaffCategory;
  role_label: string | null;
  notes: string | null;
  status: string;
  active: boolean;
  user: CamporeeStaffUserSummary | null;
};

export type CamporeeStaffCandidate = CamporeeStaffUserSummary & {
  already_staff_member_id: string | null;
};

export type AddCamporeeStaffMemberPayload = {
  user_id: string;
  category: CamporeeStaffCategory;
  role_label?: string | null;
  notes?: string | null;
};

export type UpdateCamporeeStaffMemberPayload = Partial<{
  category: CamporeeStaffCategory;
  role_label: string | null;
  notes: string | null;
  status: "active" | "inactive";
  active: boolean;
}>;

function scopedCamporeePath(scope: CamporeeStaffScope, camporeeId: number) {
  return scope === "union"
    ? `/union-camporees/${camporeeId}`
    : `/local-camporees/${camporeeId}`;
}

export async function listCamporeeStaff(
  scope: CamporeeStaffScope,
  camporeeId: number,
) {
  return apiRequest<CamporeeStaffMember[]>(`${scopedCamporeePath(scope, camporeeId)}/staff`);
}

export async function listCamporeeStaffCandidates(
  scope: CamporeeStaffScope,
  camporeeId: number,
) {
  return apiRequest<CamporeeStaffCandidate[]>(
    `${scopedCamporeePath(scope, camporeeId)}/staff-candidates`,
  );
}

export async function addCamporeeStaffMember(
  scope: CamporeeStaffScope,
  camporeeId: number,
  payload: AddCamporeeStaffMemberPayload,
) {
  return apiRequest<CamporeeStaffMember>(`${scopedCamporeePath(scope, camporeeId)}/staff`, {
    method: "POST",
    body: payload,
  });
}

export async function updateCamporeeStaffMember(
  staffMemberId: string,
  payload: UpdateCamporeeStaffMemberPayload,
) {
  return apiRequest<CamporeeStaffMember>(`/camporee-staff/${staffMemberId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteCamporeeStaffMember(staffMemberId: string) {
  return apiRequest<CamporeeStaffMember>(`/camporee-staff/${staffMemberId}`, {
    method: "DELETE",
  });
}
