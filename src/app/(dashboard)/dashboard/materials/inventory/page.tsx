import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { InventoryFilters } from "./_components/inventory-filters";
import { InventoryTable } from "./_components/inventory-table";
import { NewProductButton } from "./_components/new-product-button";
import { listInventory } from "@/lib/api/materials";
import { apiRequest } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { resolveUserLocalField } from "@/lib/auth/user-local-field";
import { hasPermission } from "@/lib/auth/permission-utils";
import { ApiError } from "@/lib/api/client";
import type {
  MaterialProduct,
  MaterialCategory,
  LocalFieldOption,
  Paginated,
} from "@/lib/types/materials";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveQ(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function resolveCat(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function resolvePage(raw: unknown): number {
  const n = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function resolveLfParam(raw: unknown): number | undefined {
  const n = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();

  if (!hasPermission(user, "materiales:manage-inventory")) {
    redirect("/dashboard");
  }

  const scope = resolveUserLocalField(user);
  const raw = await searchParams;
  const q = resolveQ(raw["q"]);
  const cat = resolveCat(raw["cat"]);
  const page = resolvePage(raw["page"]);

  // LF-scoped users always see their LF. Admin/super-admin honor
  // ?local_field_id= or default to a merged view.
  const lfOverride = resolveLfParam(raw["local_field_id"]);
  const effectiveLocalFieldId =
    scope.scope === "single" ? scope.localFieldId : lfOverride;

  let products: MaterialProduct[] = [];
  let total = 0;
  let categories: MaterialCategory[] = [];
  let localFields: LocalFieldOption[] = [];
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  // Parallel fetch: inventario + categories + (admin-only) local_fields list
  const [inventarioResult, catResult, lfResult] = await Promise.allSettled([
    listInventory({
      cat: cat || undefined,
      q: q || undefined,
      page,
      pageSize: PAGE_SIZE,
      local_field_id: effectiveLocalFieldId,
    }),
    apiRequest<{ data: MaterialCategory[] }>("/materials/catalog/categories"),
    scope.scope === "all"
      ? apiRequest<{ data: LocalFieldOption[] }>("/admin/local-fields")
      : Promise.resolve({ data: [] as LocalFieldOption[] }),
  ]);

  if (inventarioResult.status === "fulfilled") {
    const result = inventarioResult.value as Paginated<MaterialProduct>;
    products = result.data;
    total = result.total;
  } else {
    const error = inventarioResult.reason;
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = "Error al cargar el inventario.";
    }
  }

  if (catResult.status === "fulfilled") {
    categories = catResult.value.data;
  }
  if (lfResult.status === "fulfilled") {
    localFields = lfResult.value.data;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Inventario"
          description="Administrá el catálogo de productos, precios y stock por campo local."
        />
        <NewProductButton
          categories={categories}
          localFields={localFields}
          actorLocalFieldId={
            scope.scope === "single" ? scope.localFieldId : null
          }
        />
      </div>

      {/* Filters */}
      <InventoryFilters
        currentQ={q}
        currentCat={cat}
        categories={categories}
        currentLocalFieldId={effectiveLocalFieldId ?? null}
        localFields={scope.scope === "all" ? localFields : []}
      />

      {/* Error state */}
      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {/* Empty state */}
      {!loadError && products.length === 0 && (
        <EmptyState
          icon={<Package className="size-6 text-muted-foreground" aria-hidden="true" />}
          title="Sin productos"
          description={
            q || cat
              ? "Ningún producto coincide con los filtros seleccionados."
              : "No hay productos en el inventario todavía. Creá el primero."
          }
          variant={q || cat ? "no-results" : "default"}
        />
      )}

      {/* Table */}
      {!loadError && products.length > 0 && (
        <div className="space-y-4">
          <InventoryTable
            products={products}
            categories={categories}
            showLocalFieldColumn={scope.scope === "all"}
            localFields={localFields}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
            />
          )}
        </div>
      )}
    </div>
  );
}
