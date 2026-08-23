import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
import { listLocalFieldsForTerritory } from "@/lib/auth/territory-scope";
import {
  canPickLocalField,
  pickLocalFieldIdInScope,
  resolveUserLocalField,
  toLocalFieldOptions,
} from "@/lib/auth/user-local-field";
import { hasPermission } from "@/lib/auth/permission-utils";
import { MATERIALS_MANAGE_INVENTORY } from "@/lib/auth/permissions";
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
  const t = await getTranslations("materials.pages.inventory");
  const user = await requireAdminUser();

  if (!hasPermission(user, MATERIALS_MANAGE_INVENTORY)) {
    redirect("/dashboard");
  }

  const scope = resolveUserLocalField(user);
  const canPickField = canPickLocalField(scope);
  const raw = await searchParams;
  const q = resolveQ(raw["q"]);
  const cat = resolveCat(raw["cat"]);
  const page = resolvePage(raw["page"]);
  const lfOverride = resolveLfParam(raw["local_field_id"]);

  let products: MaterialProduct[] = [];
  let total = 0;
  let categories: MaterialCategory[] = [];
  let localFields: LocalFieldOption[] = [];
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  const [catResult, fields] = await Promise.all([
    apiRequest<{ data: MaterialCategory[] }>("/materials/catalog/categories")
      .then((payload) => payload.data)
      .catch(() => [] as MaterialCategory[]),
    listLocalFieldsForTerritory(user).catch(() => []),
  ]);
  categories = catResult;
  localFields = toLocalFieldOptions(fields);
  const effectiveLocalFieldId = pickLocalFieldIdInScope(
    scope,
    lfOverride,
    new Set(localFields.map((field) => field.local_field_id)),
  );

  try {
    const result = (await listInventory({
      cat: cat || undefined,
      q: q || undefined,
      page,
      pageSize: PAGE_SIZE,
      local_field_id: effectiveLocalFieldId,
    })) as Paginated<MaterialProduct>;
    products = result.data;
    total = result.total;
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = t("loadError");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={t("title")}
          description={t("description")}
        />
        <NewProductButton
          categories={categories}
          localFields={canPickField ? localFields : []}
          actorLocalFieldId={
            scope.scope === "single" ? scope.localFieldId : null
          }
        />
      </div>

      <div className="space-y-4">
        <InventoryFilters
        currentQ={q}
        currentCat={cat}
        categories={categories}
        currentLocalFieldId={effectiveLocalFieldId ?? null}
        localFields={canPickField ? localFields : []}
        />

        {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
        )}

        {!loadError && products.length === 0 && (
        <EmptyState
          icon={<Package className="size-6 text-muted-foreground" aria-hidden="true" />}
          title={t("emptyTitle")}
          description={
            q || cat
              ? t("emptyDescriptionFiltered")
              : t("emptyDescriptionDefault")
          }
          variant={q || cat ? "no-results" : "default"}
        />
        )}

        {!loadError && products.length > 0 && (
          <>
            <InventoryTable
            products={products}
            categories={categories}
            showLocalFieldColumn={canPickField}
            localFields={localFields}
            />

            {totalPages > 1 && (
              <DataTablePagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={PAGE_SIZE}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
