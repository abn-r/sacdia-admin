import { apiRequest } from "@/lib/api/client";

export type CamporeeQuery = {
  page?: number;
  limit?: number;
  type?: "local" | "union";
};

// ─── Shared pagination types ──────────────────────────────────────────────────

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

// ─── Club enrollment ──────────────────────────────────────────────────────────

export type CamporeeClub = {
  camporee_club_id: number;
  camporee_id: number;
  club_section_id: number;
  section_name?: string | null;
  club_name?: string | null;
  status?: string | null;
  registered_by?: string | null;
  registered_by_name?: string | null;
  created_at?: string | null;
  rejection_reason?: string | null;
};

export type EnrollClubPayload = {
  club_section_id: number;
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentType = "inscription" | "materials" | "other";

export type CamporeePayment = {
  payment_id: number;
  camporee_payment_id?: string | null;
  camporee_id: number;
  member_id: string;
  member_name?: string | null;
  amount: number;
  payment_type: PaymentType;
  reference?: string | null;
  notes?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  status?: string | null;
};

export type CreatePaymentPayload = {
  amount: number;
  payment_type: PaymentType;
  reference?: string;
  notes?: string;
  paid_at?: string;
};

export type UpdatePaymentPayload = Partial<CreatePaymentPayload>;

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
  camporee_member_id?: number | null;
  name?: string;
  picture_url?: string | null;
  club_name?: string | null;
  camporee_type?: "local" | "union";
  insurance_id?: number | null;
  insurance_status?: string | null;
  status?: string | null;
  rejection_reason?: string | null;
};

export type CamporeeRegisterMemberPayload = {
  user_id: string;
  camporee_type: "local" | "union";
  club_name?: string;
  insurance_id?: number;
};

export type PaginatedCamporeeMembers = PaginatedResult<CamporeeMember>;

export type ListCamporeeMembersParams = {
  page?: number;
  limit?: number;
  status?: string;
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

export async function listCamporeeMembers(
  camporeeId: number | string,
  params?: ListCamporeeMembersParams,
): Promise<PaginatedCamporeeMembers> {
  return apiRequest<PaginatedCamporeeMembers>(`/camporees/${camporeeId}/members`, {
    params,
  });
}

export async function listUnionCamporeeMembers(
  unionCamporeeId: number | string,
  params?: ListCamporeeMembersParams,
): Promise<PaginatedCamporeeMembers> {
  return apiRequest<PaginatedCamporeeMembers>(
    `/camporees/union/${unionCamporeeId}/members`,
    { params },
  );
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

// ─── Club enrollment functions ────────────────────────────────────────────────

export async function enrollClub(camporeeId: number, payload: EnrollClubPayload) {
  return apiRequest(`/camporees/${camporeeId}/clubs`, {
    method: "POST",
    body: payload,
  });
}

export async function getEnrolledClubs(camporeeId: number) {
  return apiRequest<CamporeeClub[]>(`/camporees/${camporeeId}/clubs`);
}

export async function cancelClubEnrollment(camporeeId: number, camporeeClubId: number) {
  return apiRequest(`/camporees/${camporeeId}/clubs/${camporeeClubId}`, {
    method: "DELETE",
  });
}

// ─── Payment functions ────────────────────────────────────────────────────────

export async function createPayment(
  camporeeId: number,
  memberId: string,
  payload: CreatePaymentPayload,
) {
  return apiRequest(`/camporees/${camporeeId}/members/${memberId}/payments`, {
    method: "POST",
    body: payload,
  });
}

export async function getMemberPayments(camporeeId: number, memberId: string) {
  return apiRequest<CamporeePayment[]>(
    `/camporees/${camporeeId}/members/${memberId}/payments`,
  );
}

export async function getCamporeePayments(camporeeId: number) {
  return apiRequest<CamporeePayment[]>(`/camporees/${camporeeId}/payments`);
}

export async function updatePayment(paymentId: number, payload: UpdatePaymentPayload) {
  return apiRequest(`/camporees/payments/${paymentId}`, {
    method: "PATCH",
    body: payload,
  });
}

// ─── Union camporees ───────────────────────────────────────────────────────────

export type UnionCamporee = {
  union_camporee_id?: number;
  id?: number;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  union_id?: number | null;
  union_name?: string | null;
  includes_adventurers?: boolean;
  includes_pathfinders?: boolean;
  includes_master_guides?: boolean;
  place?: string | null;
  registration_cost?: number | null;
  active?: boolean;
};

export type UnionCamporeePayload = {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  union_id: number;
  includes_adventurers: boolean;
  includes_pathfinders: boolean;
  includes_master_guides: boolean;
  place: string;
  registration_cost?: number;
  active?: boolean;
};

export async function listUnionCamporees() {
  return apiRequest<UnionCamporee[]>("/camporees/union");
}

export async function getUnionCamporeeById(id: number) {
  return apiRequest<UnionCamporee>(`/camporees/union/${id}`);
}

export async function createUnionCamporee(payload: UnionCamporeePayload) {
  return apiRequest("/camporees/union", {
    method: "POST",
    body: payload,
  });
}

export async function updateUnionCamporee(id: number, payload: Partial<UnionCamporeePayload>) {
  return apiRequest(`/camporees/union/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteUnionCamporee(id: number) {
  return apiRequest(`/camporees/union/${id}`, {
    method: "DELETE",
  });
}

// ─── Late-enrollment approvals ────────────────────────────────────────────────

export type PendingApprovals = {
  clubs: CamporeeClub[];
  members: CamporeeMember[];
  payments: CamporeePayment[];
};

export type RejectPayload = {
  rejection_reason?: string;
};

// Local camporee pending

export async function getCamporeePendingApprovals(camporeeId: number) {
  return apiRequest<PendingApprovals>(`/camporees/${camporeeId}/pending`);
}

export async function approveCamporeeClub(camporeeId: number, camporeeClubId: number) {
  return apiRequest(`/camporees/${camporeeId}/clubs/${camporeeClubId}/approve`, {
    method: "PATCH",
  });
}

export async function rejectCamporeeClub(
  camporeeId: number,
  camporeeClubId: number,
  payload: RejectPayload,
) {
  return apiRequest(`/camporees/${camporeeId}/clubs/${camporeeClubId}/reject`, {
    method: "PATCH",
    body: payload,
  });
}

export async function approveCamporeeMember(camporeeId: number, camporeeMemberId: number) {
  return apiRequest(`/camporees/${camporeeId}/members/${camporeeMemberId}/approve`, {
    method: "PATCH",
  });
}

export async function rejectCamporeeMember(
  camporeeId: number,
  camporeeMemberId: number,
  payload: RejectPayload,
) {
  return apiRequest(`/camporees/${camporeeId}/members/${camporeeMemberId}/reject`, {
    method: "PATCH",
    body: payload,
  });
}

export async function approveCamporeePayment(camporeePaymentId: string) {
  return apiRequest(`/camporees/payments/${camporeePaymentId}/approve`, {
    method: "PATCH",
  });
}

export async function rejectCamporeePayment(
  camporeePaymentId: string,
  payload: RejectPayload,
) {
  return apiRequest(`/camporees/payments/${camporeePaymentId}/reject`, {
    method: "PATCH",
    body: payload,
  });
}

// Union camporee pending

export async function getUnionCamporeePendingApprovals(camporeeId: number) {
  return apiRequest<PendingApprovals>(`/camporees/union/${camporeeId}/pending`);
}

export async function approveUnionCamporeeClub(camporeeId: number, camporeeClubId: number) {
  return apiRequest(`/camporees/union/${camporeeId}/clubs/${camporeeClubId}/approve`, {
    method: "PATCH",
  });
}

export async function rejectUnionCamporeeClub(
  camporeeId: number,
  camporeeClubId: number,
  payload: RejectPayload,
) {
  return apiRequest(`/camporees/union/${camporeeId}/clubs/${camporeeClubId}/reject`, {
    method: "PATCH",
    body: payload,
  });
}

export async function approveUnionCamporeeMember(camporeeId: number, camporeeMemberId: number) {
  return apiRequest(`/camporees/union/${camporeeId}/members/${camporeeMemberId}/approve`, {
    method: "PATCH",
  });
}

export async function rejectUnionCamporeeMember(
  camporeeId: number,
  camporeeMemberId: number,
  payload: RejectPayload,
) {
  return apiRequest(`/camporees/union/${camporeeId}/members/${camporeeMemberId}/reject`, {
    method: "PATCH",
    body: payload,
  });
}

export async function approveUnionCamporeePayment(camporeePaymentId: string) {
  return apiRequest(`/camporees/union/payments/${camporeePaymentId}/approve`, {
    method: "PATCH",
  });
}

export async function rejectUnionCamporeePayment(
  camporeePaymentId: string,
  payload: RejectPayload,
) {
  return apiRequest(`/camporees/union/payments/${camporeePaymentId}/reject`, {
    method: "PATCH",
    body: payload,
  });
}
