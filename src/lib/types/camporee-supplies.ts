import type { CamporeeKind } from "@/lib/types/camporee-orders";

export type { CamporeeKind };

export const CAMPOREE_SUPPLIES_READ = "camporee-supplies:read";
export const CAMPOREE_SUPPLIES_CONFIGURE = "camporee-supplies:configure";
export const CAMPOREE_SUPPLIES_REVIEW_PAY = "camporee-supplies:review-pay";
export const CAMPOREE_SUPPLIES_DELIVER = "camporee-supplies:deliver";

export type SupplyUom = "KG" | "L" | "BAG" | "UNIT";

export type CamporeeSupplySlot = {
  slot_id: string;
  label: string;
  deliver_time: string;
  sort_order: number;
  active: boolean;
};

export type CamporeeSupplyProduct = {
  product_id: string;
  name: string;
  uom: SupplyUom;
  unit_cost_centavos: number;
  active: boolean;
};

export type CamporeeSupplyCatalog = {
  supply_edit_cutoff_local_time: string;
  timezone: string;
  start_date: string;
  end_date: string;
  slots: CamporeeSupplySlot[];
  products: CamporeeSupplyProduct[];
};

export type CamporeeSupplyPayment = {
  payment_id: string;
  kind: "PRINCIPAL" | "CHARGE" | "REFUND";
  parent_id: string | null;
  folio_reference: string;
  total_centavos: number;
  status: "ISSUED" | "PAID" | "CANCELLED";
  note: string | null;
  created_at?: string;
  paid_at?: string | null;
};

export type CamporeeSupplyLine = {
  line_id: string;
  date: string;
  slot_id: string;
  slot_label: string;
  deliver_time: string;
  product_id: string;
  product_name: string;
  uom: string;
  qty: string;
  delivered_qty: string;
  unit_cost_centavos: number;
  line_total_centavos: number;
};

export type CamporeeSupplyPlan = {
  plan_id: string;
  club_section_id: number;
  club_name: string;
  local_field_id: number;
  status: "DRAFT" | "SUBMITTED";
  committed_total_centavos: number;
  net_centavos: number;
  submitted_at?: string | null;
  cutoff: string;
  timezone: string;
  lines: CamporeeSupplyLine[];
  payments: CamporeeSupplyPayment[];
};

export type KitchenReport = {
  timezone: string;
  date: string | null;
  rows: Array<{
    date: string;
    slot_label: string;
    deliver_time: string;
    product_name: string;
    uom: string;
    club_name: string;
    qty: string;
    delivered_qty: string;
    line_total_centavos: number;
  }>;
};

export type CashReport = {
  timezone: string;
  sections: Array<{
    plan_id: string;
    club_name: string;
    principal_centavos: number;
    charges_centavos: number;
    refunds_centavos: number;
    net_centavos: number;
    paid_centavos: number;
    outstanding_centavos: number;
  }>;
};
