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
  club_id?: number | null;
  club_type_id?: number | null;
  section_name?: string | null;
  club_name?: string | null;
  section_type_name?: string | null;
  status?: string | null;
  registered_by?: string | null;
  registered_by_name?: string | null;
  registered_by_role?: string | null;
  registered_by_picture_url?: string | null;
  created_at?: string | null;
  rejection_reason?: string | null;
};

export type EnrollClubPayload = {
  club_section_id: number;
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentType = "inscription" | "materials" | "other";

/**
 * Payment row from GET /camporees/:id/payments (and union variant).
 * Runtime Prisma payload uses `camporee_member_id` + nested `camporee_member`;
 * `member_id` / `member_name` are optional flattened aliases some clients expect.
 * `amount` may arrive as a Decimal string (`"450.00"`).
 * Status lifecycle: `registered` (on-time) | `pending_approval` (late) |
 * `approved` (late approved) | `rejected`.
 */
export type CamporeePayment = {
  payment_id?: number | null;
  camporee_payment_id: string;
  camporee_id?: number;
  camporee_member_id?: number | null;
  member_id?: string;
  member_name?: string | null;
  amount: number | string;
  payment_type: PaymentType;
  reference?: string | null;
  notes?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  status?: string | null;
  voucher_url?: string | null;
  voucher_uploaded_at?: string | null;
  camporee_member?: {
    camporee_member_id?: number;
    camporee_id?: number;
    user_id?: string;
    club_name?: string | null;
    users?: {
      name?: string | null;
      paternal_last_name?: string | null;
      maternal_last_name?: string | null;
    } | null;
  } | null;
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
  club_registration_deadline?: string | null;
  member_registration_deadline?: string | null;
  payment_deadline?: string | null;
  agenda_visible_from?: string | null;
  local_field_id?: number;
  includes_adventurers?: boolean;
  includes_pathfinders?: boolean;
  includes_master_guides?: boolean;
  local_camporee_place?: string;
  lat?: number | null;
  long?: number | null;
  registration_cost?: number;
  active?: boolean;
  local_field?: {
    local_field_id?: number;
    name?: string;
    abbreviation?: string;
  };
};

export type CamporeePayload = {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  club_registration_deadline?: string;
  member_registration_deadline?: string;
  payment_deadline?: string;
  agenda_visible_from?: string | null;
  local_field_id: number;
  includes_adventurers: boolean;
  includes_pathfinders: boolean;
  includes_master_guides: boolean;
  local_camporee_place: string;
  lat?: number;
  long?: number;
  registration_cost?: number;
  active?: boolean;
};

export type CamporeeMember = {
  user_id: string;
  camporee_member_id?: number | null;
  name?: string;
  picture_url?: string | null;
  email?: string | null;
  club_name?: string | null;
  class_name?: string | null;
  role_display_name?: string | null;
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
  insurance_id: number;
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

export async function registerUnionCamporeeMember(
  camporeeId: number,
  payload: CamporeeRegisterMemberPayload,
) {
  return apiRequest(`/camporees/union/${camporeeId}/register`, {
    method: "POST",
    body: payload,
  });
}

export async function removeUnionCamporeeMember(camporeeId: number, userId: string) {
  return apiRequest(`/camporees/union/${camporeeId}/members/${userId}`, {
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

export async function enrollClubToUnionCamporee(camporeeId: number, payload: EnrollClubPayload) {
  return apiRequest(`/camporees/union/${camporeeId}/clubs`, {
    method: "POST",
    body: payload,
  });
}

export async function getUnionEnrolledClubs(camporeeId: number) {
  return apiRequest<CamporeeClub[]>(`/camporees/union/${camporeeId}/clubs`);
}

export async function cancelUnionClubEnrollment(camporeeId: number, camporeeClubId: number) {
  return apiRequest(`/camporees/union/${camporeeId}/clubs/${camporeeClubId}`, {
    method: "DELETE",
  });
}

// ─── Payment functions ────────────────────────────────────────────────────────

/** Create a payment for an enrolled member. `memberId` is camporee_member_id. */
export async function createPayment(
  camporeeId: number,
  memberId: number | string,
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

export async function getUnionCamporeePayments(camporeeId: number) {
  return apiRequest<CamporeePayment[]>(`/camporees/union/${camporeeId}/payments`);
}

export async function updatePayment(paymentId: string, payload: UpdatePaymentPayload) {
  return apiRequest(`/camporees/payments/${paymentId}`, {
    method: "PATCH",
    body: payload,
  });
}

// ─── Payment voucher (multipart) ──────────────────────────────────────────────

export async function uploadCamporeePaymentVoucher(
  camporeeId: number,
  paymentId: string,
  file: File,
): Promise<CamporeePayment> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<CamporeePayment>(
    `/camporees/${camporeeId}/payments/${paymentId}/voucher`,
    { method: "POST", body: formData },
  );
}

export async function removeCamporeePaymentVoucher(
  camporeeId: number,
  paymentId: string,
): Promise<CamporeePayment> {
  return apiRequest<CamporeePayment>(
    `/camporees/${camporeeId}/payments/${paymentId}/voucher`,
    { method: "DELETE" },
  );
}

// ─── Union camporees ───────────────────────────────────────────────────────────

export type UnionCamporee = {
  union_camporee_id?: number;
  id?: number;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  club_registration_deadline?: string | null;
  member_registration_deadline?: string | null;
  payment_deadline?: string | null;
  agenda_visible_from?: string | null;
  union_id?: number | null;
  union_name?: string | null;
  includes_adventurers?: boolean;
  includes_pathfinders?: boolean;
  includes_master_guides?: boolean;
  union_camporee_place?: string | null;
  place?: string | null;
  lat?: number | null;
  long?: number | null;
  registration_cost?: number | null;
  active?: boolean;
};

export type UnionCamporeePayload = {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  club_registration_deadline?: string;
  member_registration_deadline?: string;
  payment_deadline?: string;
  agenda_visible_from?: string | null;
  union_id: number;
  includes_adventurers: boolean;
  includes_pathfinders: boolean;
  includes_master_guides: boolean;
  union_camporee_place: string;
  lat?: number;
  long?: number;
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
  return apiRequest(`/camporees/payments/${camporeePaymentId}/approve`, {
    method: "PATCH",
  });
}

export async function rejectUnionCamporeePayment(
  camporeePaymentId: string,
  payload: RejectPayload,
) {
  return apiRequest(`/camporees/payments/${camporeePaymentId}/reject`, {
    method: "PATCH",
    body: payload,
  });
}
