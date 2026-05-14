import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import type {
  Paginated,
  OrdenSummary,
  Orden,
  Comprobante,
  MaterialProduct,
  MaterialConfig,
} from "@/lib/types/materiales";
import type { MaterialEstado } from "@/lib/types/materiales";

// ─── Query shapes ─────────────────────────────────────────────────────────────

export type ListOrdenesQuery = {
  estado?: MaterialEstado | "all";
  club_section_id?: number;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type ListInventarioQuery = {
  cat?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type ListCatalogoQuery = {
  cat?: string;
  programa?: number;
  q?: string;
  page?: number;
  pageSize?: number;
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

export type PatchOrdenLineaPayload = {
  disponibilidad: "disponible" | "parcial" | "agotado";
  qty_disponible?: number;
};

export type UpdateConfiguracionDto = Partial<{
  bank_name: string;
  bank_account_clabe: string;
  account_holder: string;
  envio_centavos_default: number;
  pickup_address: string;
  delivery_options: unknown[];
}>;

// ─── Ordenes — server-side reads ──────────────────────────────────────────────

export async function listOrdenes(
  query: ListOrdenesQuery = {},
): Promise<Paginated<OrdenSummary>> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.estado && query.estado !== "all") params.estado = query.estado;
  if (query.club_section_id != null) params.club_section_id = query.club_section_id;
  if (query.q) params.q = query.q;
  if (query.page) params.page = query.page;
  if (query.pageSize) params.pageSize = query.pageSize;

  return apiRequest<Paginated<OrdenSummary>>("/materiales/ordenes", { params });
}

export async function getOrden(folioOrId: string): Promise<Orden> {
  return apiRequest<Orden>(`/materiales/ordenes/${folioOrId}`);
}

// ─── Ordenes — client-side mutations ─────────────────────────────────────────

export async function patchOrdenLinea(
  folioOrId: string,
  lineId: string,
  payload: PatchOrdenLineaPayload,
): Promise<Orden> {
  return apiRequestFromClient<Orden>(
    `/materiales/ordenes/${folioOrId}/lineas/${lineId}`,
    { method: "PATCH", body: payload },
  );
}

export async function aprobarOrden(folioOrId: string): Promise<Orden> {
  return apiRequestFromClient<Orden>(
    `/materiales/ordenes/${folioOrId}/aprobar`,
    { method: "POST", body: {} },
  );
}

export async function cancelarOrden(
  folioOrId: string,
  cancel_reason: string,
): Promise<Orden> {
  return apiRequestFromClient<Orden>(
    `/materiales/ordenes/${folioOrId}/cancelar`,
    { method: "POST", body: { cancel_reason } },
  );
}

export async function entregarOrden(folioOrId: string): Promise<Orden> {
  return apiRequestFromClient<Orden>(
    `/materiales/ordenes/${folioOrId}/entregar`,
    { method: "POST", body: {} },
  );
}

// ─── Comprobantes ─────────────────────────────────────────────────────────────

export async function listComprobantes(folioOrId: string): Promise<Comprobante[]> {
  return apiRequest<Comprobante[]>(`/materiales/comprobantes/${folioOrId}`);
}

export async function aprobarComprobante(
  folioOrId: string,
  comprobante_id: string,
): Promise<{ comprobante: Comprobante; order: Orden }> {
  return apiRequestFromClient<{ comprobante: Comprobante; order: Orden }>(
    `/materiales/comprobantes/${folioOrId}/aprobar`,
    { method: "POST", body: { comprobante_id } },
  );
}

export async function rechazarComprobante(
  folioOrId: string,
  comprobante_id: string,
  reject_reason: string,
): Promise<Comprobante> {
  return apiRequestFromClient<Comprobante>(
    `/materiales/comprobantes/${folioOrId}/rechazar`,
    { method: "POST", body: { comprobante_id, reject_reason } },
  );
}

// ─── Inventario — server-side reads ──────────────────────────────────────────

export async function listInventario(
  query: ListInventarioQuery = {},
): Promise<Paginated<MaterialProduct>> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.cat) params.cat = query.cat;
  if (query.q) params.q = query.q;
  if (query.page) params.page = query.page;
  if (query.pageSize) params.pageSize = query.pageSize;

  return apiRequest<Paginated<MaterialProduct>>("/materiales/inventario", { params });
}

// ─── Inventario — client-side mutations ──────────────────────────────────────

export async function createProduct(dto: CreateProductDto): Promise<MaterialProduct> {
  return apiRequestFromClient<MaterialProduct>("/materiales/inventario", {
    method: "POST",
    body: dto,
  });
}

export async function updateProduct(
  id: string,
  dto: UpdateProductDto,
): Promise<MaterialProduct> {
  return apiRequestFromClient<MaterialProduct>(`/materiales/inventario/${id}`, {
    method: "PATCH",
    body: dto,
  });
}

export async function deleteProduct(id: string): Promise<{ id: string; active: false }> {
  return apiRequestFromClient<{ id: string; active: false }>(
    `/materiales/inventario/${id}`,
    { method: "DELETE" },
  );
}

export async function updateVariantStock(
  productId: string,
  variantId: string,
  stock: number,
): Promise<{ option: unknown; product: MaterialProduct }> {
  return apiRequestFromClient<{ option: unknown; product: MaterialProduct }>(
    `/materiales/inventario/${productId}/variantes/${variantId}`,
    { method: "PATCH", body: { stock } },
  );
}

// ─── Catálogo (public-ish, directors) ────────────────────────────────────────

export async function listCatalogo(
  query: ListCatalogoQuery = {},
): Promise<Paginated<MaterialProduct>> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.cat) params.cat = query.cat;
  if (query.programa != null) params.programa = query.programa;
  if (query.q) params.q = query.q;
  if (query.page) params.page = query.page;
  if (query.pageSize) params.pageSize = query.pageSize;

  return apiRequest<Paginated<MaterialProduct>>("/materiales/catalogo", { params });
}

// ─── Configuración ────────────────────────────────────────────────────────────

export async function getConfiguracion(): Promise<MaterialConfig> {
  return apiRequest<MaterialConfig>("/materiales/configuracion");
}

export async function updateConfiguracion(
  dto: UpdateConfiguracionDto,
): Promise<MaterialConfig> {
  return apiRequestFromClient<MaterialConfig>("/materiales/configuracion", {
    method: "PATCH",
    body: dto,
  });
}
