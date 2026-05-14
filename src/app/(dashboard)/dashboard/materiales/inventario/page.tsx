import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { InventarioFilters } from "./_components/inventario-filters";
import { InventarioTable } from "./_components/inventario-table";
import { NuevoProductoButton } from "./_components/nuevo-producto-button";
import { listInventario } from "@/lib/api/materiales";
import { apiRequest } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import { ApiError } from "@/lib/api/client";
import type { MaterialProduct, MaterialCategory } from "@/lib/types/materiales";
import type { Paginated } from "@/lib/types/materiales";

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

  const raw = await searchParams;
  const q = resolveQ(raw["q"]);
  const cat = resolveCat(raw["cat"]);
  const page = resolvePage(raw["page"]);

  let products: MaterialProduct[] = [];
  let total = 0;
  let categories: MaterialCategory[] = [];
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  // Parallel fetch: inventario + categories
  const [inventarioResult, catResult] = await Promise.allSettled([
    listInventario({
      cat: cat || undefined,
      q: q || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    apiRequest<{ data: MaterialCategory[] }>("/materiales/catalogo/categorias"),
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
  // If categories fail, filters degrade gracefully (empty list)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Inventario"
          description="Administrá el catálogo de productos, precios y stock."
        />
        <NuevoProductoButton categories={categories} />
      </div>

      {/* Filters */}
      <InventarioFilters currentQ={q} currentCat={cat} categories={categories} />

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
          <InventarioTable products={products} categories={categories} />

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
