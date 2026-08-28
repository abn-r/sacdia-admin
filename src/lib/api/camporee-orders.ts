/**
 * Admin API client for merchandise camporee orders.
 * Distinct from inscription `/payment-orders`.
 * Contract: docs/plans/handoffs/camporee-orders-admin-handoff.md
 */
import {
  API_BASE_URL,
  ApiError,
  apiRequest,
  getClientAuthToken,
} from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";
import {
  buildCreateCamporeeOrderBody,
  type CamporeeKind,
  type CamporeeOrder,
  type CamporeeOrderListFilters,
  type CamporeeOrderOfferingsCatalog,
  type CamporeeOrderProduct,
  type CamporeeOrderProductOption,
  type CamporeeOrderProofDownload,
  type CamporeeOrderProofUploadResult,
  type CamporeeOrderSettings,
  type CreateCamporeeOrderLineInput,
  type CreateCamporeeOrderProductInput,
  type CreateCamporeeOrderProductOptionInput,
  type ReplaceCamporeeOfferingItemInput,
  type UpdateCamporeeOrderProductInput,
  type UpdateCamporeeOrderProductOptionInput,
  type UpdateCamporeeOrderSettingsInput,
} from "@/lib/types/camporee-orders";

export {
  buildCreateCamporeeOrderBody,
  CAMPOREE_ORDER_STATUSES,
  CAMPOREE_ORDERS_AUTHORIZE_WITHOUT_PROOF,
  CAMPOREE_ORDERS_CATALOG_MANAGE,
  CAMPOREE_ORDERS_CREATE,
  CAMPOREE_ORDERS_DELIVER,
  CAMPOREE_ORDERS_DISTRIBUTE,
  CAMPOREE_ORDERS_OFFERING_CONFIGURE,
  CAMPOREE_ORDERS_READ,
  CAMPOREE_ORDERS_REVIEW,
  CAMPOREE_ORDERS_UPLOAD_PROOF,
  canDeliverToSection,
  canVisualizeDistribution,
  createPayloadHasClientAmounts,
  deriveDistributionStatus,
  isExactCatalogOwner,
  summarizeNamedLines,
} from "@/lib/types/camporee-orders";

export type {
  CamporeeKind,
  CamporeeOrder,
  CamporeeOrderDistributionStatus,
  CamporeeOrderLine,
  CamporeeOrderListFilters,
  CamporeeOrderOfferingsCatalog,
  CamporeeOrderOwnerScope,
  CamporeeOrderProduct,
  CamporeeOrderProductOption,
  CamporeeOrderProof,
  CamporeeOrderProofDownload,
  CamporeeOrderProofStatus,
  CamporeeOrderProofUploadResult,
  CamporeeOrderSettings,
  CamporeeOrderSizeScheme,
  CamporeeOrderStatus,
  CamporeeOrderSummaryItem,
  CatalogTerritoryActor,
  CreateCamporeeOrderLineInput,
  CreateCamporeeOrderPayload,
  CreateCamporeeOrderProductInput,
  CreateCamporeeOrderProductOptionInput,
  ReplaceCamporeeOfferingItemInput,
  UpdateCamporeeOrderProductInput,
  UpdateCamporeeOrderProductOptionInput,
  UpdateCamporeeOrderSettingsInput,
} from "@/lib/types/camporee-orders";

export const CAMPOREE_ORDER_ERROR_MESSAGES: Record<string, string> = {
  CAMPOREE_ORDERS_DISABLED: "Los pedidos de este camporee están desactivados.",
  CAMPOREE_ORDERS_NOT_OPEN: "La ventana de pedidos aún no abre.",
  CAMPOREE_ORDERS_CLOSED: "La ventana de pedidos ya cerró.",
  CAMPOREE_ORDER_NOT_FOUND: "Pedido no encontrado.",
  CAMPOREE_ORDER_FORBIDDEN: "No tienes permiso o estás fuera de alcance.",
  CAMPOREE_ORDER_INVALID_TRANSITION: "Transición de estado no permitida.",
  CAMPOREE_ORDER_LINES_REQUIRED: "El pedido requiere al menos una línea.",
  CAMPOREE_ORDER_MEMBER_NOT_ELIGIBLE:
    "El miembro no está inscrito o no es elegible.",
  CAMPOREE_ORDER_OFFERING_INVALID:
    "La oferta no es válida para este camporee.",
  CAMPOREE_ORDER_OPTION_REQUIRED: "Este producto exige una talla.",
  CAMPOREE_ORDER_OPTION_FORBIDDEN:
    "La talla no es válida o no se puede modificar.",
  CAMPOREE_ORDER_PRODUCT_SCOPE_INVALID:
    "El producto está fuera del alcance territorial.",
  CAMPOREE_ORDER_PAYMENT_CONFIG_REQUIRED:
    "El Campo Local no tiene instrucciones de pago.",
  CAMPOREE_ORDER_MAKER_CHECKER:
    "Quien subió el comprobante no puede aprobarlo.",
  CAMPOREE_ORDER_PROOF_INVALID_FILE: "El archivo del comprobante no es válido.",
  CAMPOREE_ORDER_PROOF_NOT_FOUND: "No hay comprobante vigente.",
  CAMPOREE_ORDER_REJECT_REASON_REQUIRED: "El rechazo requiere un motivo.",
  CAMPOREE_ORDER_AUTHORIZATION_REASON_REQUIRED:
    "La autorización sin comprobante requiere un motivo.",
  CAMPOREE_ORDER_NOT_DELIVERED_TO_SECTION:
    "El pedido aún no fue entregado a la sección.",
  CAMPOREE_ORDER_LINE_NOT_FOUND: "La línea del pedido no existe.",
  CAMPOREE_ORDER_DISTRIBUTION_FORBIDDEN:
    "Solo el director de la sección puede marcar la entrega al miembro.",
};

function extractErrorCode(error: unknown): string | null {
  if (
    !(error instanceof ApiError) ||
    !error.payload ||
    typeof error.payload !== "object"
  ) {
    return null;
  }
  const payload = error.payload as { code?: unknown };
  return typeof payload.code === "string" ? payload.code : null;
}

export function getCamporeeOrderErrorCode(error: unknown): string | null {
  return extractErrorCode(error);
}

export function getCamporeeOrderErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la acción.",
): string {
  const code = extractErrorCode(error);
  if (code && CAMPOREE_ORDER_ERROR_MESSAGES[code]) {
    return CAMPOREE_ORDER_ERROR_MESSAGES[code];
  }
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return CAMPOREE_ORDER_ERROR_MESSAGES.CAMPOREE_ORDER_FORBIDDEN;
    }
    if (error.message) {
      return error.message;
    }
  }
  return fallback;
}

function camporeeCollection(kind: CamporeeKind): string {
  return kind === "union" ? "/union-camporees" : "/camporees";
}

function buildOrderFilters(filters: CamporeeOrderListFilters) {
  const params: Record<string, string> = {};
  if (filters.camporee_id) params.camporee_id = String(filters.camporee_id);
  if (filters.union_camporee_id) {
    params.union_camporee_id = String(filters.union_camporee_id);
  }
  if (filters.status) params.status = filters.status;
  return Object.keys(params).length > 0 ? params : undefined;
}

export async function listCamporeeOrderProducts(filters: {
  active?: boolean;
} = {}): Promise<CamporeeOrderProduct[]> {
  const payload = await apiRequest<unknown>("/camporee-order-products", {
    params:
      typeof filters.active === "boolean"
        ? { active: filters.active }
        : undefined,
  });
  return unwrapApiData<CamporeeOrderProduct[]>(payload);
}

export async function getCamporeeOrderProduct(
  productId: string,
): Promise<CamporeeOrderProduct> {
  const payload = await apiRequest<unknown>(
    `/camporee-order-products/${productId}`,
  );
  return unwrapApiData<CamporeeOrderProduct>(payload);
}

export async function createCamporeeOrderProduct(
  input: CreateCamporeeOrderProductInput,
): Promise<CamporeeOrderProduct> {
  const payload = await apiRequest<unknown>("/camporee-order-products", {
    method: "POST",
    body: input,
  });
  return unwrapApiData<CamporeeOrderProduct>(payload);
}

export async function updateCamporeeOrderProduct(
  productId: string,
  input: UpdateCamporeeOrderProductInput,
): Promise<CamporeeOrderProduct> {
  const payload = await apiRequest<unknown>(
    `/camporee-order-products/${productId}`,
    { method: "PATCH", body: input },
  );
  return unwrapApiData<CamporeeOrderProduct>(payload);
}

export async function addCamporeeOrderProductOption(
  productId: string,
  input: CreateCamporeeOrderProductOptionInput,
): Promise<CamporeeOrderProductOption> {
  const payload = await apiRequest<unknown>(
    `/camporee-order-products/${productId}/options`,
    { method: "POST", body: input },
  );
  return unwrapApiData<CamporeeOrderProductOption>(payload);
}

export async function updateCamporeeOrderProductOption(
  optionId: string,
  input: UpdateCamporeeOrderProductOptionInput,
): Promise<CamporeeOrderProductOption> {
  const payload = await apiRequest<unknown>(
    `/camporee-order-product-options/${optionId}`,
    { method: "PATCH", body: input },
  );
  return unwrapApiData<CamporeeOrderProductOption>(payload);
}

export async function updateCamporeeOrderSettings(
  camporeeId: number,
  kind: CamporeeKind,
  input: UpdateCamporeeOrderSettingsInput,
): Promise<CamporeeOrderSettings> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/orders-settings`,
    { method: "PATCH", body: input },
  );
  return unwrapApiData<CamporeeOrderSettings>(payload);
}

export async function getCamporeeOrderOfferings(
  camporeeId: number,
  kind: CamporeeKind = "local",
): Promise<CamporeeOrderOfferingsCatalog> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/order-offerings`,
  );
  return unwrapApiData<CamporeeOrderOfferingsCatalog>(payload);
}

export async function replaceCamporeeOrderOfferings(
  camporeeId: number,
  kind: CamporeeKind,
  items: ReplaceCamporeeOfferingItemInput[],
): Promise<CamporeeOrderOfferingsCatalog> {
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/order-offerings`,
    { method: "PUT", body: { items } },
  );
  return unwrapApiData<CamporeeOrderOfferingsCatalog>(payload);
}

export async function listCamporeeOrders(
  filters: CamporeeOrderListFilters = {},
): Promise<CamporeeOrder[]> {
  const payload = await apiRequest<unknown>("/camporee-orders", {
    params: buildOrderFilters(filters),
  });
  return unwrapApiData<CamporeeOrder[]>(payload);
}

export async function getCamporeeOrdersReviewQueue(): Promise<CamporeeOrder[]> {
  const payload = await apiRequest<unknown>("/camporee-orders/review-queue");
  return unwrapApiData<CamporeeOrder[]>(payload);
}

export async function getCamporeeOrder(orderId: string): Promise<CamporeeOrder> {
  const payload = await apiRequest<unknown>(`/camporee-orders/${orderId}`);
  return unwrapApiData<CamporeeOrder>(payload);
}

export async function createCamporeeOrder(
  camporeeId: number,
  kind: CamporeeKind,
  lines: CreateCamporeeOrderLineInput[],
  options: { idempotencyKey?: string } = {},
): Promise<CamporeeOrder> {
  const body = buildCreateCamporeeOrderBody(lines);
  const payload = await apiRequest<unknown>(
    `${camporeeCollection(kind)}/${camporeeId}/orders`,
    {
      method: "POST",
      body,
      headers: options.idempotencyKey
        ? { "Idempotency-Key": options.idempotencyKey }
        : undefined,
    },
  );
  return unwrapApiData<CamporeeOrder>(payload);
}

export async function downloadCamporeeOrderPdf(orderId: string): Promise<Blob> {
  const token = await getClientAuthToken();
  const headers: Record<string, string> = { Accept: "application/pdf" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/camporee-orders/${encodeURIComponent(orderId)}/document`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(`No se pudo descargar el PDF (${response.status})`);
  }
  return response.blob();
}

export async function getCamporeeOrderProofDownload(
  orderId: string,
): Promise<CamporeeOrderProofDownload> {
  const payload = await apiRequest<unknown>(
    `/camporee-orders/${orderId}/proof`,
  );
  return unwrapApiData<CamporeeOrderProofDownload>(payload);
}

export async function uploadCamporeeOrderProof(
  orderId: string,
  file: File | Blob,
): Promise<CamporeeOrderProofUploadResult> {
  const form = new FormData();
  form.append("file", file);
  const payload = await apiRequest<unknown>(
    `/camporee-orders/${orderId}/proof`,
    { method: "POST", body: form },
  );
  return unwrapApiData<CamporeeOrderProofUploadResult>(payload);
}

export async function cancelCamporeeOrder(
  orderId: string,
  reason?: string,
): Promise<CamporeeOrder> {
  const payload = await apiRequest<unknown>(
    `/camporee-orders/${orderId}/cancel`,
    {
      method: "POST",
      body: reason ? { reason } : {},
    },
  );
  return unwrapApiData<CamporeeOrder>(payload);
}

export async function approveCamporeeOrder(
  orderId: string,
): Promise<CamporeeOrder> {
  const payload = await apiRequest<unknown>(
    `/camporee-orders/${orderId}/approve`,
    { method: "POST" },
  );
  return unwrapApiData<CamporeeOrder>(payload);
}

export async function rejectCamporeeOrder(
  orderId: string,
  reason: string,
): Promise<CamporeeOrder> {
  const payload = await apiRequest<unknown>(
    `/camporee-orders/${orderId}/reject`,
    { method: "POST", body: { reason } },
  );
  return unwrapApiData<CamporeeOrder>(payload);
}

export async function authorizeCamporeeOrderWithoutProof(
  orderId: string,
  reason: string,
): Promise<CamporeeOrder> {
  const payload = await apiRequest<unknown>(
    `/camporee-orders/${orderId}/authorize-without-proof`,
    { method: "POST", body: { reason } },
  );
  return unwrapApiData<CamporeeOrder>(payload);
}

export async function deliverCamporeeOrderToSection(
  orderId: string,
): Promise<CamporeeOrder> {
  const payload = await apiRequest<unknown>(
    `/camporee-orders/${orderId}/deliver`,
    { method: "POST" },
  );
  return unwrapApiData<CamporeeOrder>(payload);
}

/** Director-only on the backend. Admin visualizes progress; do not impersonate. */
export async function deliverCamporeeOrderLineToMember(
  orderId: string,
  lineId: string,
): Promise<CamporeeOrder> {
  const payload = await apiRequest<unknown>(
    `/camporee-orders/${orderId}/lines/${lineId}/deliver-to-member`,
    { method: "POST" },
  );
  return unwrapApiData<CamporeeOrder>(payload);
}
