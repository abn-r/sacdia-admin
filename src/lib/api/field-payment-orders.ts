/**
 * Admin API client for field payment orders (insurance + camporee) and
 * insurance reassignment requests.
 * Backend: /payment-orders/..., /insurance/reassignments/...
 * Contract: docs/plans/handoffs/field-payment-orders-admin-handoff.md
 */
import { API_BASE_URL, apiRequest, getClientAuthToken } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import { listNormalizedClubSectionMembers } from "@/lib/api/clubs";
import { attachPaymentOrderBeneficiaries } from "@/lib/payment-orders/display";

export type PaymentOrderPurpose = "INSURANCE" | "CAMPOREE";

export type PaymentOrderStatus =
  | "ISSUED"
  | "PROOF_SUBMITTED"
  | "APPROVED"
  | "PROOF_REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type PaymentOrderProofStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export type PaymentOrderUserLike = {
  user_id?: string;
  id?: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  picture_url?: string | null;
  user_image?: string | null;
  avatar_url?: string | null;
};

export type PaymentOrderLineBeneficiary = {
  user_id: string;
  full_name: string | null;
  picture_url: string | null;
  email: string | null;
};

export type PaymentOrderLine = {
  field_payment_order_line_id: string;
  sequence: number;
  beneficiary_user_id: string;
  unit_cost_centavos: number;
  purpose: PaymentOrderPurpose;
  purpose_ref_id: number;
  insurance_assignment_id: number | null;
  camporee_member_id: number | null;
  /** Present after GET detail normalization, or nested Prisma `users.*`. */
  full_name?: string | null;
  beneficiary_full_name?: string | null;
  users?: PaymentOrderUserLike | null;
  user?: PaymentOrderUserLike | null;
  member?: PaymentOrderUserLike | null;
  beneficiary?: PaymentOrderUserLike | PaymentOrderLineBeneficiary | null;
  beneficiary_user?: PaymentOrderUserLike | null;
};

export type PaymentOrderProof = {
  field_payment_order_proof_id: string;
  file_name: string;
  mime_type: string;
  status: PaymentOrderProofStatus;
  reject_reason: string | null;
  uploaded_by_id: string;
  reviewed_by_id: string | null;
  created_at: string;
  original_file_name?: string | null;
  original_filename?: string | null;
  display_name?: string | null;
};

export type PaymentOrder = {
  field_payment_order_id: string;
  purpose: PaymentOrderPurpose;
  local_field_id: number;
  club_id: number;
  club_section_id: number;
  folio: number;
  folio_reference: string;
  insurance_cycle_config_id: number | null;
  local_camporee_id: number | null;
  union_camporee_id: number | null;
  currency: string;
  unit_cost_centavos: number;
  total_centavos: number;
  status: PaymentOrderStatus;
  expires_at: string;
  issued_by_id: string;
  approved_by_id: string | null;
  cancelled_by_id: string | null;
  created_at: string;
  lines?: PaymentOrderLine[];
  proofs?: PaymentOrderProof[];
};

export type PaymentOrderListFilters = {
  purpose?: PaymentOrderPurpose;
  status?: PaymentOrderStatus;
  camporee_id?: number;
  union_camporee_id?: number;
};

export type ProofDownload = {
  url: string;
  expires_in: number;
  file_name: string;
  mime_type: string;
  status: PaymentOrderProofStatus;
  uploaded_by_id: string;
  created_at: string;
};

export type PaymentOrderConfig = {
  field_payment_order_config_id: number;
  local_field_id: number;
  bank_name: string | null;
  bank_account: string | null;
  bank_clabe: string | null;
  bank_holder: string | null;
  cash_instructions: string | null;
  extra_notes: string | null;
  active: boolean;
};

export type UpsertPaymentOrderConfigInput = {
  /** Optional for LF leadership (backend resolves it); required for global admins. */
  local_field_id?: number;
  bank_name?: string;
  bank_account?: string;
  bank_clabe?: string;
  bank_holder?: string;
  cash_instructions?: string;
  extra_notes?: string;
  active?: boolean;
};

export type ReassignmentStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ReassignmentRequest = {
  insurance_reassignment_request_id: number;
  insurance_assignment_id: number;
  from_user_id: string;
  to_user_id: string;
  reason: string | null;
  status: ReassignmentStatus;
  reject_reason: string | null;
  requested_by_id: string;
  reviewed_by_id: string | null;
  created_at: string;
};

function buildFilters(filters: PaymentOrderListFilters) {
  const params: Record<string, string> = {};
  if (filters.purpose) params.purpose = filters.purpose;
  if (filters.status) params.status = filters.status;
  if (filters.camporee_id) params.camporee_id = String(filters.camporee_id);
  if (filters.union_camporee_id)
    params.union_camporee_id = String(filters.union_camporee_id);
  return Object.keys(params).length > 0 ? params : undefined;
}

export async function listPaymentOrders(
  filters: PaymentOrderListFilters = {},
): Promise<PaymentOrder[]> {
  const payload = await apiRequest<unknown>("/payment-orders", {
    params: buildFilters(filters),
  });
  return unwrapApiData<PaymentOrder[]>(payload);
}

export async function getPaymentOrdersReviewQueue(
  filters: Omit<PaymentOrderListFilters, "status"> = {},
): Promise<PaymentOrder[]> {
  const payload = await apiRequest<unknown>("/payment-orders/review-queue", {
    params: buildFilters(filters),
  });
  return unwrapApiData<PaymentOrder[]>(payload);
}

export async function getPaymentOrder(orderId: string): Promise<PaymentOrder> {
  const payload = await apiRequest<unknown>(`/payment-orders/${orderId}`);
  const order = unwrapApiData<PaymentOrder>(payload);
  return attachPaymentOrderBeneficiaries(order, async () => {
    try {
      return await listNormalizedClubSectionMembers(
        order.club_id,
        order.club_section_id,
      );
    } catch {
      return [];
    }
  });
}

export async function getPaymentOrderProofDownload(
  orderId: string,
): Promise<ProofDownload> {
  const payload = await apiRequest<unknown>(`/payment-orders/${orderId}/proof`);
  return unwrapApiData<ProofDownload>(payload);
}

export async function downloadPaymentOrderPdf(orderId: string): Promise<Blob> {
  const token = await getClientAuthToken();
  const headers: Record<string, string> = { Accept: "application/pdf" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/payment-orders/${encodeURIComponent(orderId)}/document`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(`No se pudo descargar el PDF (${response.status})`);
  }

  return response.blob();
}

export async function triggerPaymentOrderPdfDownload(
  orderId: string,
  filename = `orden-${orderId}.pdf`,
): Promise<void> {
  const blob = await downloadPaymentOrderPdf(orderId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function approvePaymentOrder(
  orderId: string,
): Promise<PaymentOrder> {
  const payload = await apiRequest<unknown>(
    `/payment-orders/${orderId}/approve`,
    { method: "POST" },
  );
  return unwrapApiData<PaymentOrder>(payload);
}

export async function rejectPaymentOrder(
  orderId: string,
  reason: string,
): Promise<PaymentOrder> {
  const payload = await apiRequest<unknown>(
    `/payment-orders/${orderId}/reject`,
    { method: "POST", body: { reason } },
  );
  return unwrapApiData<PaymentOrder>(payload);
}

export async function getPaymentOrderConfig(
  localFieldId?: number,
): Promise<PaymentOrderConfig> {
  const payload = await apiRequest<unknown>("/payment-orders/config", {
    params: localFieldId ? { local_field_id: String(localFieldId) } : undefined,
  });
  return unwrapApiData<PaymentOrderConfig>(payload);
}

export async function upsertPaymentOrderConfig(
  input: UpsertPaymentOrderConfigInput,
): Promise<PaymentOrderConfig> {
  const payload = await apiRequest<unknown>("/payment-orders/config", {
    method: "POST",
    body: input,
  });
  return unwrapApiData<PaymentOrderConfig>(payload);
}

export async function listReassignments(
  status?: ReassignmentStatus,
): Promise<ReassignmentRequest[]> {
  const payload = await apiRequest<unknown>("/insurance/reassignments", {
    params: status ? { status } : undefined,
  });
  return unwrapApiData<ReassignmentRequest[]>(payload);
}

export async function approveReassignment(
  requestId: number,
): Promise<ReassignmentRequest> {
  const payload = await apiRequest<unknown>(
    `/insurance/reassignments/${requestId}/approve`,
    { method: "POST" },
  );
  return unwrapApiData<ReassignmentRequest>(payload);
}

export async function rejectReassignment(
  requestId: number,
  reason: string,
): Promise<ReassignmentRequest> {
  const payload = await apiRequest<unknown>(
    `/insurance/reassignments/${requestId}/reject`,
    { method: "POST", body: { reason } },
  );
  return unwrapApiData<ReassignmentRequest>(payload);
}
