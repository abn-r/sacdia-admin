/**
 * Aggregated pending-payment read model.
 * Sources stay as separate rows: inscription, materials, camporee merchandise
 * folios, and camporee supply PRINCIPAL/CHARGE/REFUND docs. Never merge folios.
 */

export type PaymentObligationSource =
  | "CAMPOREE_ORDER"
  | "CAMPOREE_SUPPLY_CHARGE"
  | "CAMPOREE_SUPPLY_REFUND"
  | "FIELD_PAYMENT_ORDER"
  | "MATERIAL_ORDER";

export type PaymentObligationPurpose =
  | "CAMPOREE_MATERIALS"
  | "CAMPOREE_SUPPLIES"
  | "CAMPOREE"
  | "INSURANCE"
  | "MATERIALS";

export type PaymentObligationStatus =
  | "PAYMENT_DUE"
  | "UNDER_REVIEW"
  | "PROOF_REJECTED"
  | "ORDER_REVIEW";

export type PaymentObligationAction =
  | "UPLOAD_PROOF"
  | "WAIT_REVIEW"
  | "RESUBMIT_PROOF"
  | "WAIT_APPROVAL"
  | "PAY_AT_CAMP"
  | "PROCESS_REFUND";

export type PaymentObligationCamporee = {
  type: "local" | "union";
  id: number;
  name: string;
};

export type PaymentObligation = {
  source: PaymentObligationSource;
  source_id: string;
  purpose: PaymentObligationPurpose;
  folio: string;
  total_centavos: number;
  currency: "MXN";
  status: PaymentObligationStatus;
  action_required: PaymentObligationAction;
  camporee: PaymentObligationCamporee | null;
  created_at: string;
};

export type PaymentObligationListFilters = {
  camporee_id?: number;
  union_camporee_id?: number;
};

/**
 * Admin detail routes. Mutations stay on the owning surface:
 * inscription tray, materials request, camporee-order review, camporee supplies tab.
 */
export function paymentObligationDetailPath(
  obligation: Pick<PaymentObligation, "source" | "source_id" | "camporee">,
): string {
  const id = encodeURIComponent(obligation.source_id);
  switch (obligation.source) {
    case "FIELD_PAYMENT_ORDER":
      return `/dashboard/payment-orders?orderId=${id}`;
    case "MATERIAL_ORDER":
      return `/dashboard/materials/request/${id}`;
    case "CAMPOREE_ORDER":
      return `/dashboard/campamentos/pedidos/bandeja?orderId=${id}`;
    case "CAMPOREE_SUPPLY_CHARGE":
    case "CAMPOREE_SUPPLY_REFUND": {
      const camporee = obligation.camporee;
      if (!camporee) return "/dashboard/campamentos";
      const base =
        camporee.type === "union"
          ? `/dashboard/campamentos/union/${camporee.id}`
          : `/dashboard/campamentos/${camporee.id}`;
      return `${base}?tab=supplies`;
    }
  }
}

export function paymentObligationActionOwner(
  source: PaymentObligationSource,
): "inscription" | "materials" | "camporee-order" | "camporee-supplies" {
  switch (source) {
    case "FIELD_PAYMENT_ORDER":
      return "inscription";
    case "MATERIAL_ORDER":
      return "materials";
    case "CAMPOREE_ORDER":
      return "camporee-order";
    case "CAMPOREE_SUPPLY_CHARGE":
    case "CAMPOREE_SUPPLY_REFUND":
      return "camporee-supplies";
  }
}
