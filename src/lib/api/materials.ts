import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import type {
  Paginated,
  OrdenSummary,
  Orden,
  Comprobante,
  MaterialProduct,
  MaterialConfig,
  MaterialCategoryAdmin,
} from "@/lib/types/materials";
import type { MaterialEstado } from "@/lib/types/materials";

// ─── Categories (admin CRUD) ─────────────────────────────────────────────────

export type CreateCategoryDto = {
  slug: string;
  label: string;
  icon?: string | null;
  sort_order?: number;
  active?: boolean;
};

export type UpdateCategoryDto = Partial<{
  label: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
}>;

export async function listCategoriesAdmin(): Promise<MaterialCategoryAdmin[]> {
  return apiRequest<MaterialCategoryAdmin[]>("/materials/categories");
}

export async function createCategory(
  dto: CreateCategoryDto,
): Promise<MaterialCategoryAdmin> {
  return apiRequestFromClient<MaterialCategoryAdmin>("/materials/categories", {
    method: "POST",
    body: dto,
  });
}

export async function updateCategory(
  id: string,
  dto: UpdateCategoryDto,
): Promise<MaterialCategoryAdmin> {
  return apiRequestFromClient<MaterialCategoryAdmin>(
    `/materials/categories/${id}`,
    { method: "PATCH", body: dto },
  );
}

export async function deleteCategory(
  id: string,
): Promise<{ id: string; active: false }> {
  return apiRequestFromClient<{ id: string; active: false }>(
    `/materials/categories/${id}`,
    { method: "DELETE" },
  );
}

// ─── Query shapes ─────────────────────────────────────────────────────────────

// All list queries accept an optional local_field_id override. LF-scoped
// callers can omit it (server forces their scope); unscoped admins may pass
// one to filter, or omit it for a merged-across-LF view.

export type ListOrdersQuery = {
  estado?: MaterialEstado | "all";
  club_section_id?: number;
  q?: string;
  page?: number;
  pageSize?: number;
  local_field_id?: number;
};

export type ListInventoryQuery = {
  cat?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  local_field_id?: number;
};

export type ListCatalogQuery = {
  cat?: string;
  programa?: number;
  q?: string;
  page?: number;
  pageSize?: number;
  local_field_id?: number;
};

// ─── DTO shapes for mutations ─────────────────────────────────────────────────

export type CreateProductDto = {
  sku: string;
  title: string;
  material_category_id: string;
  club_type_id: number;
  price_centavos: number;
  description?: string;
  stock?: number;
  active?: boolean;
};

export type UpdateProductDto = Partial<{
  title: string;
  description: string;
  price_centavos: number;
  stock: number;
  active: boolean;
}>;

export type PatchOrderLinePayload = {
  disponibilidad: "disponible" | "parcial" | "agotado";
  qty_disponible?: number;
};

export type UpdateConfigDto = Partial<{
  bank_name: string;
  bank_account_clabe: string;
  account_holder: string;
  envio_centavos_default: number;
  pickup_address: string;
  delivery_options: unknown[];
}>;

// ─── Orders — server-side reads ──────────────────────────────────────────────

export async function listOrders(
  query: ListOrdersQuery = {},
): Promise<Paginated<OrdenSummary>> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.estado && query.estado !== "all") params.estado = query.estado;
  if (query.club_section_id != null) params.club_section_id = query.club_section_id;
  if (query.q) params.q = query.q;
  if (query.page) params.page = query.page;
  if (query.pageSize) params.pageSize = query.pageSize;
  if (query.local_field_id != null) params.local_field_id = query.local_field_id;

  return apiRequest<Paginated<OrdenSummary>>("/materials/orders", { params });
}

export async function getOrder(folioOrId: string): Promise<Orden> {
  return apiRequest<Orden>(`/materials/orders/${folioOrId}`);
}

// ─── Orders — client-side mutations ─────────────────────────────────────────

export async function patchOrderLine(
  folioOrId: string,
  lineId: string,
  payload: PatchOrderLinePayload,
): Promise<Orden> {
  return apiRequestFromClient<Orden>(
    `/materials/orders/${folioOrId}/lines/${lineId}`,
    { method: "PATCH", body: payload },
  );
}

export async function approveOrder(folioOrId: string): Promise<Orden> {
  return apiRequestFromClient<Orden>(
    `/materials/orders/${folioOrId}/approve`,
    { method: "POST", body: {} },
  );
}

export async function cancelOrder(
  folioOrId: string,
  cancel_reason: string,
): Promise<Orden> {
  return apiRequestFromClient<Orden>(
    `/materials/orders/${folioOrId}/cancel`,
    { method: "POST", body: { cancel_reason } },
  );
}

export async function deliverOrder(folioOrId: string): Promise<Orden> {
  return apiRequestFromClient<Orden>(
    `/materials/orders/${folioOrId}/deliver`,
    { method: "POST", body: {} },
  );
}

// ─── Receipts ─────────────────────────────────────────────────────────────────

export async function listReceipts(folioOrId: string): Promise<Comprobante[]> {
  return apiRequest<Comprobante[]>(`/materials/receipts/${folioOrId}`);
}

export async function approveReceipt(
  folioOrId: string,
  comprobante_id: string,
): Promise<{ comprobante: Comprobante; order: Orden }> {
  return apiRequestFromClient<{ comprobante: Comprobante; order: Orden }>(
    `/materials/receipts/${folioOrId}/approve`,
    { method: "POST", body: { comprobante_id } },
  );
}

export async function rejectReceipt(
  folioOrId: string,
  comprobante_id: string,
  reject_reason: string,
): Promise<Comprobante> {
  return apiRequestFromClient<Comprobante>(
    `/materials/receipts/${folioOrId}/reject`,
    { method: "POST", body: { comprobante_id, reject_reason } },
  );
}

// ─── Inventory — server-side reads ──────────────────────────────────────────

export async function listInventory(
  query: ListInventoryQuery = {},
): Promise<Paginated<MaterialProduct>> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.cat) params.cat = query.cat;
  if (query.q) params.q = query.q;
  if (query.page) params.page = query.page;
  if (query.pageSize) params.pageSize = query.pageSize;
  if (query.local_field_id != null) params.local_field_id = query.local_field_id;

  return apiRequest<Paginated<MaterialProduct>>("/materials/inventory", { params });
}

// ─── Inventory — client-side mutations ──────────────────────────────────────

export async function createProduct(
  dto: CreateProductDto,
  options: { localFieldId?: number } = {},
): Promise<MaterialProduct> {
  const search =
    options.localFieldId != null
      ? `?local_field_id=${options.localFieldId}`
      : "";
  return apiRequestFromClient<MaterialProduct>(
    `/materials/inventory${search}`,
    { method: "POST", body: dto },
  );
}

export async function updateProduct(
  id: string,
  dto: UpdateProductDto,
): Promise<MaterialProduct> {
  return apiRequestFromClient<MaterialProduct>(`/materials/inventory/${id}`, {
    method: "PATCH",
    body: dto,
  });
}

export async function deleteProduct(id: string): Promise<{ id: string; active: false }> {
  return apiRequestFromClient<{ id: string; active: false }>(
    `/materials/inventory/${id}`,
    { method: "DELETE" },
  );
}

export async function updateVariantStock(
  productId: string,
  variantId: string,
  stock: number,
): Promise<{ option: unknown; product: MaterialProduct }> {
  return apiRequestFromClient<{ option: unknown; product: MaterialProduct }>(
    `/materials/inventory/${productId}/variants/${variantId}`,
    { method: "PATCH", body: { stock } },
  );
}

// ─── Catalog (public-ish, directors) ────────────────────────────────────────

export async function listCatalog(
  query: ListCatalogQuery = {},
): Promise<Paginated<MaterialProduct>> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.cat) params.cat = query.cat;
  if (query.programa != null) params.programa = query.programa;
  if (query.q) params.q = query.q;
  if (query.page) params.page = query.page;
  if (query.pageSize) params.pageSize = query.pageSize;
  if (query.local_field_id != null) params.local_field_id = query.local_field_id;

  return apiRequest<Paginated<MaterialProduct>>("/materials/catalog", { params });
}

// ─── Config ────────────────────────────────────────────────────────────────

export async function getConfig(
  options: { localFieldId?: number } = {},
): Promise<MaterialConfig> {
  const params: Record<string, string | number | undefined> = {};
  if (options.localFieldId != null) params.local_field_id = options.localFieldId;
  return apiRequest<MaterialConfig>("/materials/config", { params });
}

/** Admin/super-admin only — list configs across every local_field. */
export async function listConfigAll(): Promise<MaterialConfig[]> {
  return apiRequest<MaterialConfig[]>("/materials/config/all");
}

export async function updateConfig(
  dto: UpdateConfigDto,
  options: { localFieldId?: number } = {},
): Promise<MaterialConfig> {
  const search =
    options.localFieldId != null
      ? `?local_field_id=${options.localFieldId}`
      : "";
  return apiRequestFromClient<MaterialConfig>(
    `/materials/config${search}`,
    { method: "PATCH", body: dto },
  );
}
