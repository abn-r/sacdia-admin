/**
 * Runtime types for merchandise camporee orders (not inscription payment-orders).
 * Source: sacdia-backend feat/camporee-orders DTOs and views.
 */

export const CAMPOREE_ORDERS_READ = "camporee-orders:read";
export const CAMPOREE_ORDERS_CATALOG_MANAGE = "camporee-orders:catalog-manage";
export const CAMPOREE_ORDERS_OFFERING_CONFIGURE =
  "camporee-orders:offering-configure";
export const CAMPOREE_ORDERS_CREATE = "camporee-orders:create";
export const CAMPOREE_ORDERS_UPLOAD_PROOF = "camporee-orders:upload-proof";
export const CAMPOREE_ORDERS_REVIEW = "camporee-orders:review";
export const CAMPOREE_ORDERS_AUTHORIZE_WITHOUT_PROOF =
  "camporee-orders:authorize-without-proof";
export const CAMPOREE_ORDERS_DELIVER = "camporee-orders:deliver";
export const CAMPOREE_ORDERS_DISTRIBUTE = "camporee-orders:distribute";

export type CamporeeKind = "local" | "union";

export type CamporeeOrderStatus =
  | "ISSUED"
  | "PROOF_SUBMITTED"
  | "PROOF_REJECTED"
  | "PAID"
  | "DELIVERED"
  | "CANCELLED"
  | "EXPIRED";

export const CAMPOREE_ORDER_STATUSES: readonly CamporeeOrderStatus[] = [
  "ISSUED",
  "PROOF_SUBMITTED",
  "PROOF_REJECTED",
  "PAID",
  "DELIVERED",
  "CANCELLED",
  "EXPIRED",
] as const;

export type CamporeeOrderDistributionStatus =
  | "NOT_STARTED"
  | "PARTIAL"
  | "COMPLETE";

export type CamporeeOrderProofStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export type CamporeeOrderOwnerScope = "DIVISION" | "UNION" | "LOCAL_FIELD";

export type CamporeeOrderSizeScheme = "LETTER" | "NUMERIC" | "NONE";

export type CamporeeOrderProductOption = {
  camporee_order_product_option_id: string;
  product_id: string;
  label: string;
  sort_order: number;
  active: boolean;
};

export type CamporeeOrderProduct = {
  camporee_order_product_id: string;
  owner_scope: CamporeeOrderOwnerScope;
  owner_division_id: number | null;
  owner_union_id: number | null;
  owner_local_field_id: number | null;
  title: string;
  description: string | null;
  size_scheme: CamporeeOrderSizeScheme;
  club_type_id: number | null;
  active: boolean;
  created_by_id?: string;
  modified_by_id?: string;
  created_at?: string;
  modified_at?: string;
  options: CamporeeOrderProductOption[];
};

export type CreateCamporeeOrderProductInput = {
  title: string;
  description?: string;
  size_scheme: CamporeeOrderSizeScheme;
  club_type_id?: number;
  /** Hint for admin/all actors. Territorial roles ignore this as authority. */
  owner_scope?: CamporeeOrderOwnerScope;
  owner_division_id?: number;
  owner_union_id?: number;
  owner_local_field_id?: number;
};

export type UpdateCamporeeOrderProductInput = {
  title?: string;
  description?: string | null;
  size_scheme?: CamporeeOrderSizeScheme;
  club_type_id?: number | null;
  active?: boolean;
};

export type CreateCamporeeOrderProductOptionInput = {
  label: string;
  sort_order?: number;
};

export type UpdateCamporeeOrderProductOptionInput = {
  label?: string;
  sort_order?: number;
  active?: boolean;
};

export type CamporeeOrderSettings = {
  orders_enabled: boolean;
  orders_opens_at: string | null;
  orders_deadline: string | null;
};

export type UpdateCamporeeOrderSettingsInput = {
  orders_enabled?: boolean;
  orders_opens_at?: string | null;
  orders_deadline?: string | null;
};

export type CamporeeOrderOffering = {
  camporee_order_offering_id: string;
  local_camporee_id: number | null;
  union_camporee_id: number | null;
  product_id: string;
  price_centavos: number;
  active: boolean;
  sort_order: number;
  product: CamporeeOrderProduct;
};

export type CamporeeOrderOfferingsCatalog = {
  settings: CamporeeOrderSettings;
  items: CamporeeOrderOffering[];
};

export type ReplaceCamporeeOfferingItemInput = {
  product_id: string;
  price_centavos: number;
  active?: boolean;
  sort_order?: number;
};

export type CamporeeOrderLine = {
  camporee_order_line_id: string;
  sequence: number;
  camporee_member_id: number;
  beneficiary_user_id: string;
  beneficiary_name_snapshot: string;
  offering_id: string;
  product_id: string;
  option_id: string | null;
  product_title_snapshot: string;
  option_label_snapshot: string | null;
  qty: number;
  unit_price_centavos: number;
  line_total_centavos: number;
  delivered_to_member_at: string | null;
  delivered_to_member_by_id: string | null;
};

export type CamporeeOrderSummaryItem = {
  product_title_snapshot: string;
  option_label_snapshot: string | null;
  qty: number;
  subtotal_centavos: number;
};

export type CamporeeOrder = {
  camporee_order_id: string;
  local_field_id: number;
  club_id: number;
  club_section_id: number;
  local_camporee_id: number | null;
  union_camporee_id: number | null;
  folio: number;
  folio_reference: string;
  status: CamporeeOrderStatus;
  currency: string;
  total_centavos: number;
  expires_at: string;
  issued_by_id: string;
  approved_by_id: string | null;
  approved_at: string | null;
  authorized_without_proof: boolean;
  authorized_by_id: string | null;
  authorized_at: string | null;
  authorization_reason: string | null;
  delivered_to_section_by_id: string | null;
  delivered_to_section_at: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_clabe: string | null;
  bank_holder: string | null;
  cash_instructions: string | null;
  extra_notes: string | null;
  created_at: string;
  modified_at: string;
  lines: CamporeeOrderLine[];
  summary: CamporeeOrderSummaryItem[];
  distribution_status: CamporeeOrderDistributionStatus;
};

export type CamporeeOrderListFilters = {
  camporee_id?: number;
  union_camporee_id?: number;
  status?: CamporeeOrderStatus;
};

/**
 * Create payload. The client never sends prices or totals; the server
 * snapshots them from the offering.
 */
export type CreateCamporeeOrderLineInput = {
  camporee_member_id: number;
  offering_id: string;
  option_id?: string | null;
  qty: number;
};

export type CreateCamporeeOrderPayload = {
  lines: Array<{
    camporee_member_id: number;
    offering_id: string;
    option_id?: string;
    qty: number;
  }>;
};

export type CamporeeOrderProof = {
  camporee_order_proof_id: string;
  order_id?: string;
  file_name: string;
  mime_type: string;
  size_bytes?: number;
  status: CamporeeOrderProofStatus;
  reject_reason?: string | null;
  uploaded_by_id: string;
  reviewed_by_id?: string | null;
  created_at: string;
};

export type CamporeeOrderProofDownload = {
  url: string;
  expires_in: number;
  file_name: string;
  mime_type: string;
  status: CamporeeOrderProofStatus;
  uploaded_by_id: string;
  created_at: string;
};

export type CamporeeOrderProofUploadResult = {
  proof: CamporeeOrderProof;
  order: CamporeeOrder;
};

export type CatalogTerritoryActor = {
  level: "all" | "division" | "union" | "local_field" | "unconfigured" | "open";
  divisionId?: number | null;
  unionId?: number | null;
  localFieldId?: number | null;
};

const AMOUNT_KEYS = [
  "unit_price_centavos",
  "line_total_centavos",
  "total_centavos",
  "price_centavos",
] as const;

export function buildCreateCamporeeOrderBody(
  lines: CreateCamporeeOrderLineInput[],
): CreateCamporeeOrderPayload {
  return {
    lines: lines.map((line) => {
      const item: CreateCamporeeOrderPayload["lines"][number] = {
        camporee_member_id: line.camporee_member_id,
        offering_id: line.offering_id,
        qty: line.qty,
      };
      if (typeof line.option_id === "string" && line.option_id.length > 0) {
        item.option_id = line.option_id;
      }
      return item;
    }),
  };
}

export function createPayloadHasClientAmounts(
  payload: CreateCamporeeOrderPayload,
): boolean {
  const encoded = JSON.stringify(payload);
  return AMOUNT_KEYS.some((key) => encoded.includes(`"${key}"`));
}

export function deriveDistributionStatus(
  lines: Array<{ delivered_to_member_at: string | null }>,
): CamporeeOrderDistributionStatus {
  if (lines.length === 0) {
    return "NOT_STARTED";
  }
  const delivered = lines.filter((line) => line.delivered_to_member_at != null)
    .length;
  if (delivered === 0) {
    return "NOT_STARTED";
  }
  if (delivered === lines.length) {
    return "COMPLETE";
  }
  return "PARTIAL";
}

export function summarizeNamedLines(
  lines: Array<{
    product_title_snapshot: string;
    option_label_snapshot: string | null;
    qty: number;
    line_total_centavos: number;
  }>,
): CamporeeOrderSummaryItem[] {
  const grouped = new Map<string, CamporeeOrderSummaryItem>();
  for (const line of lines) {
    const key = `${line.product_title_snapshot}\0${line.option_label_snapshot ?? ""}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += line.qty;
      existing.subtotal_centavos += line.line_total_centavos;
      continue;
    }
    grouped.set(key, {
      product_title_snapshot: line.product_title_snapshot,
      option_label_snapshot: line.option_label_snapshot,
      qty: line.qty,
      subtotal_centavos: line.line_total_centavos,
    });
  }
  return [...grouped.values()];
}

/** LF → sección. Admin may invoke this; it is not director distribution. */
export function canDeliverToSection(status: CamporeeOrderStatus): boolean {
  return status === "PAID";
}

/** Section → member. Admin visualizes this; it does not impersonate the director. */
export function canVisualizeDistribution(status: CamporeeOrderStatus): boolean {
  return status === "DELIVERED";
}

/**
 * Task 12 catalog rule: mutate only the exact owner. Ancestors are read-only
 * even if the backend currently allows some ancestor writes on descendants.
 */
export function isExactCatalogOwner(
  product: Pick<
    CamporeeOrderProduct,
    | "owner_scope"
    | "owner_division_id"
    | "owner_union_id"
    | "owner_local_field_id"
  >,
  actor: CatalogTerritoryActor,
): boolean {
  if (actor.level === "all") {
    return true;
  }
  if (actor.level === "unconfigured" || actor.level === "open") {
    return false;
  }
  if (product.owner_scope === "DIVISION") {
    return (
      actor.level === "division" &&
      product.owner_division_id === actor.divisionId
    );
  }
  if (product.owner_scope === "UNION") {
    return actor.level === "union" && product.owner_union_id === actor.unionId;
  }
  return (
    actor.level === "local_field" &&
    product.owner_local_field_id === actor.localFieldId
  );
}
