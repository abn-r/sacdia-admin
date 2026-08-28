import { ApiError, apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import type { CamporeeKind } from "@/lib/types/camporee-orders";
import type {
  CamporeeSupplyCatalog,
  CamporeeSupplyPayment,
  CamporeeSupplyPlan,
  CamporeeSupplyProduct,
  CamporeeSupplySlot,
  CashReport,
  KitchenReport,
  SupplyUom,
} from "@/lib/types/camporee-supplies";

export type {
  CamporeeSupplyCatalog,
  CamporeeSupplyPayment,
  CamporeeSupplyPlan,
  CamporeeSupplyProduct,
  CamporeeSupplySlot,
  CashReport,
  KitchenReport,
};

function camporeeCollection(kind: CamporeeKind): string {
  return kind === "union" ? "/union-camporees" : "/camporees";
}

function extractErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }
  const payload = error.payload as { code?: unknown };
  return typeof payload.code === "string" ? payload.code : null;
}

export function getCamporeeSupplyErrorCode(error: unknown): string | null {
  return extractErrorCode(error);
}

export async function getCamporeeSupplyCatalog(
  camporeeId: number,
  kind: CamporeeKind = "local",
): Promise<CamporeeSupplyCatalog> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-catalog`,
  );
  return unwrapApiData<CamporeeSupplyCatalog>(payload);
}

export async function updateCamporeeSupplySettings(
  camporeeId: number,
  kind: CamporeeKind,
  input: { supply_edit_cutoff_local_time: string },
): Promise<CamporeeSupplyCatalog> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-settings`,
    { method: "PATCH", body: input },
  );
  return unwrapApiData<CamporeeSupplyCatalog>(payload);
}

export async function createCamporeeSupplySlot(
  camporeeId: number,
  kind: CamporeeKind,
  input: { label: string; deliver_time: string; sort_order?: number },
): Promise<CamporeeSupplySlot> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-slots`,
    { method: "POST", body: input },
  );
  return unwrapApiData<CamporeeSupplySlot>(payload);
}

export async function updateCamporeeSupplySlot(
  camporeeId: number,
  kind: CamporeeKind,
  slotId: string,
  input: {
    label?: string;
    deliver_time?: string;
    sort_order?: number;
    active?: boolean;
  },
): Promise<CamporeeSupplySlot> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-slots/${slotId}`,
    { method: "PATCH", body: input },
  );
  return unwrapApiData<CamporeeSupplySlot>(payload);
}

export async function createCamporeeSupplyProduct(
  camporeeId: number,
  kind: CamporeeKind,
  input: { name: string; uom: SupplyUom; unit_cost_centavos: number },
): Promise<CamporeeSupplyProduct> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-products`,
    { method: "POST", body: input },
  );
  return unwrapApiData<CamporeeSupplyProduct>(payload);
}

export async function updateCamporeeSupplyProduct(
  camporeeId: number,
  kind: CamporeeKind,
  productId: string,
  input: {
    name?: string;
    uom?: SupplyUom;
    unit_cost_centavos?: number;
    active?: boolean;
  },
): Promise<CamporeeSupplyProduct> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-products/${productId}`,
    { method: "PATCH", body: input },
  );
  return unwrapApiData<CamporeeSupplyProduct>(payload);
}

export async function listCamporeeSupplyPlans(
  camporeeId: number,
  kind: CamporeeKind = "local",
): Promise<CamporeeSupplyPlan[]> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-plans`,
  );
  return unwrapApiData<CamporeeSupplyPlan[]>(payload);
}

export async function getCamporeeSupplyKitchenReport(
  camporeeId: number,
  kind: CamporeeKind = "local",
  date?: string,
): Promise<KitchenReport> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-reports/kitchen`,
    { params: date ? { date } : undefined },
  );
  return unwrapApiData<KitchenReport>(payload);
}

export async function getCamporeeSupplyCashReport(
  camporeeId: number,
  kind: CamporeeKind = "local",
): Promise<CashReport> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-reports/cash`,
  );
  return unwrapApiData<CashReport>(payload);
}

export async function deliverCamporeeSupplyLine(
  camporeeId: number,
  kind: CamporeeKind,
  lineId: string,
  input: { qty: number; note?: string },
): Promise<CamporeeSupplyPlan> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-lines/${lineId}/deliveries`,
    { method: "POST", body: input },
  );
  return unwrapApiData<CamporeeSupplyPlan>(payload);
}

export async function markCamporeeSupplyPaymentPaid(
  paymentId: string,
): Promise<CamporeeSupplyPayment> {
  const payload = await apiRequest<unknown>(
    `/camporee-supply-payments/${paymentId}/mark-paid`,
    { method: "POST" },
  );
  return unwrapApiData<CamporeeSupplyPayment>(payload);
}

export async function adjustCamporeeSupplyLine(
  camporeeId: number,
  kind: CamporeeKind,
  input: {
    club_section_id: number;
    date: string;
    slot_id: string;
    product_id: string;
    qty: number;
    bypass_reason?: string;
  },
): Promise<CamporeeSupplyPlan> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/supply-plan/lines`,
    { method: "PATCH", body: input },
  );
  return unwrapApiData<CamporeeSupplyPlan>(payload);
}

export function formatSupplyCentavos(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}
