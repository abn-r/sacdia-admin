import { apiRequest } from "@/lib/api/client";

export type CamporeeQuery = {
  page?: number;
  limit?: number;
  type?: "local" | "union";
};

export type Camporee = {
  camporee_id?: number;
  local_camporee_id?: number;
  id?: number;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  local_field_id?: number;
  includes_adventurers?: boolean;
  includes_pathfinders?: boolean;
  includes_master_guides?: boolean;
  local_camporee_place?: string;
  registration_cost?: number;
  active?: boolean;
};

export type CamporeePayload = {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  local_field_id: number;
  includes_adventurers: boolean;
  includes_pathfinders: boolean;
  includes_master_guides: boolean;
  local_camporee_place: string;
  registration_cost?: number;
  active?: boolean;
};

export type CamporeeMember = {
  user_id: string;
  name?: string;
  picture_url?: string | null;
  club_name?: string | null;
  camporee_type?: "local" | "union";
  insurance_id?: number | null;
  insurance_status?: string | null;
};

export type CamporeeRegisterMemberPayload = {
  user_id: string;
  camporee_type: "local" | "union";
  club_name?: string;
  insurance_id?: number;
};

export async function listCamporees(query: CamporeeQuery = {}) {
  return apiRequest("/camporees", { params: query });
}

export async function getCamporeeById(camporeeId: number) {
  return apiRequest(`/camporees/${camporeeId}`);
}

export async function createCamporee(payload: CamporeePayload) {
  return apiRequest("/camporees", {
    method: "POST",
    body: payload,
  });
}

export async function updateCamporee(camporeeId: number, payload: Partial<CamporeePayload>) {
  return apiRequest(`/camporees/${camporeeId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteCamporee(camporeeId: number) {
  return apiRequest(`/camporees/${camporeeId}`, {
    method: "DELETE",
  });
}

export async function listCamporeeMembers(camporeeId: number) {
  return apiRequest<CamporeeMember[]>(`/camporees/${camporeeId}/members`);
}

export async function registerCamporeeMember(
  camporeeId: number,
  payload: CamporeeRegisterMemberPayload,
) {
  return apiRequest(`/camporees/${camporeeId}/register`, {
    method: "POST",
    body: payload,
  });
}

export async function removeCamporeeMember(camporeeId: number, userId: string) {
  return apiRequest(`/camporees/${camporeeId}/members/${userId}`, {
    method: "DELETE",
  });
}
