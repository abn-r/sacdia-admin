/**
 * Admin API client for the pending-payment read model.
 * Combines inscription, materials, and camporee merchandise folios
 * without merging rows or actions.
 */
import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type {
  PaymentObligation,
  PaymentObligationListFilters,
} from "@/lib/types/payment-obligations";

export {
  paymentObligationActionOwner,
  paymentObligationDetailPath,
} from "@/lib/types/payment-obligations";

export type {
  PaymentObligation,
  PaymentObligationAction,
  PaymentObligationCamporee,
  PaymentObligationListFilters,
  PaymentObligationPurpose,
  PaymentObligationSource,
  PaymentObligationStatus,
} from "@/lib/types/payment-obligations";

function buildFilters(filters: PaymentObligationListFilters) {
  const params: Record<string, string> = {};
  if (filters.camporee_id) params.camporee_id = String(filters.camporee_id);
  if (filters.union_camporee_id) {
    params.union_camporee_id = String(filters.union_camporee_id);
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

export async function listPendingPaymentObligations(
  filters: PaymentObligationListFilters = {},
): Promise<PaymentObligation[]> {
  const payload = await apiRequest<unknown>("/payment-obligations/pending", {
    params: buildFilters(filters),
  });
  return unwrapApiData<PaymentObligation[]>(payload);
}
