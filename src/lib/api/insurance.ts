import { apiRequest, apiRequestFromClient, API_BASE_URL } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsuranceType =
  | "GENERAL_ACTIVITIES"
  | "CAMPOREE"
  | "HIGH_RISK";

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  GENERAL_ACTIVITIES: "Actividades generales",
  CAMPOREE: "Camporee",
  HIGH_RISK: "Alto riesgo",
};

export type InsuranceRecord = {
  insurance_id: number;
  insurance_type: InsuranceType | null;
  policy_number: string | null;
  provider: string | null;
  start_date: string | null;
  end_date: string | null;
  coverage_amount: number | null;
  active: boolean | null;
  evidence_file_url: string | null;
  evidence_file_name: string | null;
  created_at: string | null;
  modified_at: string | null;
  created_by_name: string | null;
  modified_by_name: string | null;
};

export type MemberInsurance = {
  user_id: string;
  name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  user_image: string | null;
  current_class?: { name: string } | null;
  insurance: InsuranceRecord | null;
};

export type MemberInsuranceDetail = {
  user_id: string;
  user: {
    user_id: string;
    name: string | null;
    paternal_last_name: string | null;
    maternal_last_name: string | null;
    user_image: string | null;
    current_class?: { name: string } | null;
  };
  current_class?: { name: string } | null;
  insurance: InsuranceRecord | null;
};

export type CreateInsurancePayload = {
  insurance_type: InsuranceType;
  start_date: string;
  end_date: string;
  policy_number?: string;
  provider?: string;
  coverage_amount?: number;
  evidence?: File | null;
};

export type UpdateInsurancePayload = Partial<CreateInsurancePayload> & {
  active?: boolean;
};

// ─── Expiring insurance types ─────────────────────────────────────────────────

export type ExpiringInsurance = {
  insurance_id: number;
  user_id: string;
  user_name: string | null;
  name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  local_field_id: number | null;
  club: { club_id: number; name: string } | null;
  club_section: { club_section_id: number; name: string } | null;
  insurance_type: InsuranceType | null;
  policy_number: string | null;
  provider: string | null;
  start_date: string | null;
  end_date: string | null;
  coverage_amount: number | null;
  days_remaining: number;
  is_expiring_soon: boolean;
};

// ─── Server-side API functions ────────────────────────────────────────────────

export async function getExpiringInsurance(
  daysAhead = 30,
  localFieldId?: number,
): Promise<ExpiringInsurance[]> {
  const params: Record<string, number> = { days_ahead: daysAhead };
  if (localFieldId !== undefined) {
    params.local_field_id = localFieldId;
  }
  const payload = await apiRequest<{ status: string; data: ExpiringInsurance[] }>(
    "/insurance/expiring",
    { params },
  );
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function listMembersInsurance(
  clubId: number,
  sectionId: number,
): Promise<unknown> {
  return apiRequest(
    `/clubs/${clubId}/sections/${sectionId}/members/insurance`,
  );
}

export async function getMemberInsurance(memberId: string): Promise<unknown> {
  return apiRequest(`/users/${memberId}/insurance`);
}

// ─── Client-side API functions ────────────────────────────────────────────────

export async function createInsurance(
  memberId: string,
  payload: CreateInsurancePayload,
): Promise<unknown> {
  const formData = new FormData();
  formData.append("insurance_type", payload.insurance_type);
  formData.append("start_date", payload.start_date);
  formData.append("end_date", payload.end_date);
  if (payload.policy_number) formData.append("policy_number", payload.policy_number);
  if (payload.provider) formData.append("provider", payload.provider);
  if (payload.coverage_amount !== undefined)
    formData.append("coverage_amount", String(payload.coverage_amount));
  if (payload.evidence) formData.append("evidence", payload.evidence);

  // Use apiRequestFromClient with FormData body — client.ts detects BodyInit and skips Content-Type override
  return apiRequestFromClient(`/users/${memberId}/insurance`, {
    method: "POST",
    body: formData,
  });
}

export async function updateInsurance(
  insuranceId: number,
  payload: UpdateInsurancePayload,
): Promise<unknown> {
  const formData = new FormData();
  if (payload.insurance_type) formData.append("insurance_type", payload.insurance_type);
  if (payload.start_date) formData.append("start_date", payload.start_date);
  if (payload.end_date) formData.append("end_date", payload.end_date);
  if (payload.policy_number !== undefined) formData.append("policy_number", payload.policy_number);
  if (payload.provider !== undefined) formData.append("provider", payload.provider);
  if (payload.coverage_amount !== undefined)
    formData.append("coverage_amount", String(payload.coverage_amount));
  if (payload.active !== undefined) formData.append("active", String(payload.active));
  if (payload.evidence) formData.append("evidence", payload.evidence);

  return apiRequestFromClient(`/insurance/${insuranceId}`, {
    method: "PATCH",
    body: formData,
  });
}

/** Soft-delete: PATCH active=false */
export async function deactivateInsurance(
  insuranceId: number,
): Promise<unknown> {
  const formData = new FormData();
  formData.append("active", "false");

  return apiRequestFromClient(`/insurance/${insuranceId}`, {
    method: "PATCH",
    body: formData,
  });
}
