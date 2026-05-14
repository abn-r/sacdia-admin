// ─── Enums ────────────────────────────────────────────────────────────────────

export type MaterialEstado =
  | "en_revision"
  | "aprobada"
  | "pagada"
  | "entregada"
  | "cancelada";

export type MaterialDisponibilidad =
  | "pendiente"
  | "disponible"
  | "parcial"
  | "agotado";

export type MaterialComprobanteStatus = "pendiente" | "aprobado" | "rechazado";

export type MaterialEntrega = "recoger" | "envio";

// ─── Catalog ──────────────────────────────────────────────────────────────────

export type MaterialCategory = {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sort_order: number;
  /** Count of active products in this category */
  count?: number;
};

export type MaterialPrograma = {
  id: number;
  label: string;
};

// ─── Products & Variants ──────────────────────────────────────────────────────

export type MaterialVariantOption = {
  id: string;
  label: string;
  stock: number;
};

export type MaterialVariant = {
  type: string;
  options: MaterialVariantOption[];
};

export type MaterialProduct = {
  id: string;
  local_field_id: number;
  sku: string;
  title: string;
  description: string | null;
  price_centavos: number;
  stock: number;
  active: boolean;
  cat: MaterialCategory;
  programa: MaterialPrograma;
  variants: MaterialVariant | null;
  /** Variant count — present in inventario list responses */
  _count?: { variants: number };
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrdenSummary = {
  id: string;
  folio_referencia: string | null;
  estado: MaterialEstado;
  created_at: string;
  director: {
    nombre: string;
    club: string;
  };
  subtotal_centavos: number;
  total_centavos: number;
};

export type OrdenLine = {
  id: string;
  product_id: string;
  variant_option_id: string | null;
  qty: number;
  price_centavos: number;
  disponibilidad: MaterialDisponibilidad;
  qty_disponible: number | null;
  line_total_centavos: number;
  product: Pick<MaterialProduct, "id" | "sku" | "title"> | null;
  variant_option: { id: string; label: string } | null;
};

export type Orden = {
  id: string;
  local_field_id: number;
  folio_referencia: string | null;
  estado: MaterialEstado;
  club_section_id: number;
  created_by: string;
  approved_by: string | null;
  validated_by: string | null;
  delivered_by: string | null;
  cancelled_by: string | null;
  subtotal_centavos: number;
  envio_centavos: number;
  total_centavos: number;
  entrega: MaterialEntrega;
  notas: string | null;
  cancel_reason: string | null;
  refund_pending: boolean;
  // Snapshotted bank fields (set at approval)
  bank_name: string | null;
  bank_account_clabe: string | null;
  account_holder: string | null;
  pickup_address: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  director?: {
    nombre: string | null;
    club: string | null;
    user_id: string;
  } | null;
  local_field?: {
    local_field_id: number;
    name: string | null;
    abbreviation: string | null;
  };
  lines: OrdenLine[];
  comprobantes: Comprobante[];
};

// ─── Comprobantes ─────────────────────────────────────────────────────────────

export type Comprobante = {
  id: string;
  status: MaterialComprobanteStatus;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  monto_centavos: number;
  ref_bancaria_declarada: string | null;
  fecha_pago: string | null;
  /** R2 signed URL (TTL 15 min). May be null on URL-generation failure. */
  signed_url: string | null;
  uploaded_by: string;
  validated_by: string | null;
  reject_reason: string | null;
  created_at: string;
  validated_at: string | null;
};

// ─── Config ───────────────────────────────────────────────────────────────────

export type MaterialConfig = {
  local_field_id: number;
  bank_name: string | null;
  bank_account_clabe: string | null;
  account_holder: string | null;
  envio_centavos_default: number;
  pickup_address: string | null;
  delivery_options: unknown[];
  updated_at: string | null;
};

/** Convenience for displaying a config row alongside its LF metadata. */
export type MaterialConfigWithLocalField = MaterialConfig & {
  local_field: {
    local_field_id: number;
    name: string;
    abbreviation: string;
  };
};

/** Shape of GET /catalogs/local-fields used by selectors in the admin. */
export type LocalFieldOption = {
  local_field_id: number;
  name: string;
  abbreviation: string;
};

// ─── Admin categories (CRUD) ──────────────────────────────────────────────────

export type MaterialCategoryAdmin = {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
