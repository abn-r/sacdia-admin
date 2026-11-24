import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Plus, Tag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { UrlTabs } from "@/components/shared/url-tabs";
import { Button } from "@/components/ui/button";
import { listCategoriesAdmin, listInventory } from "@/lib/api/materials";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { listLocalFieldsForTerritory } from "@/lib/auth/territory-scope";
import {
  canPickLocalField,
  pickLocalFieldIdInScope,
  resolveUserLocalField,
  toLocalFieldOptions,
} from "@/lib/auth/user-local-field";
import { MATERIALS_CATALOG_HREF, MATERIALS_CATEGORIES_HREF } from "@/lib/materials/routes";
import type { LocalFieldOption, MaterialCategoryAdmin, MaterialProduct } from "@/lib/types/materials";
import { CatalogFilters } from "./_components/catalog-filters";
import { CategoriesTable } from "./_components/categories-table";
import { ProductsTable } from "./_components/products-table";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const LIMIT_OPTIONS = [20, 50, 100];

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function positiveInt(raw: string | undefined): number | undefined {
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ops.materials.catalog");
  return { title: t("title") };
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "materials-inventory")) redirect("/dashboard");

  const t = await getTranslations("ops.materials.catalog");
  const tInv = await getTranslations("materials.pages.inventory");
  const tCat = await getTranslations("materials.pages.categories");
  const raw = await searchParams;

  const tab = first(raw["tab"]) === "categories" ? "categories" : "products";
  const q = (first(raw["q"]) ?? "").trim();
  const cat = (first(raw["cat"]) ?? "").trim();
  const page = positiveInt(first(raw["page"])) ?? 1;
  const limitRaw = positiveInt(first(raw["limit"]));
  const limit = limitRaw && LIMIT_OPTIONS.includes(limitRaw) ? limitRaw : LIMIT_OPTIONS[0]!;
  const canManage = canCapability(user, "materials-inventory", "manage");

  const scope = resolveUserLocalField(user);
  const canPickField = canPickLocalField(scope);
  const [categoriesResult, fields] = await Promise.all([
    listCategoriesAdmin().then(
      (data) => ({ ok: true as const, data }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    canPickField ? listLocalFieldsForTerritory(user).catch(() => []) : Promise.resolve([]),
  ]);
  const localFields: LocalFieldOption[] = toLocalFieldOptions(fields);
  const effectiveLocalFieldId = pickLocalFieldIdInScope(
    scope,
    positiveInt(first(raw["local_field_id"])),
    new Set(localFields.map((field) => field.local_field_id)),
  );

  const categories: MaterialCategoryAdmin[] = categoriesResult.ok ? categoriesResult.data : [];

  // Products are only loaded for their tab; the header finding needs the unfiltered total.
  let products: MaterialProduct[] = [];
  let productsTotal = 0;
  let overallProducts: number | null = null;
  let failure: ErrorStateFromError | null = null;

  if (tab === "products") {
    try {
      const result = await listInventory({
        cat: cat || undefined,
        q: q || undefined,
        page,
        pageSize: limit,
        local_field_id: effectiveLocalFieldId,
      });
      products = result.data;
      productsTotal = result.total;
      if (!cat && !q) overallProducts = result.total;
    } catch (error) {
      failure = errorStateFromError(error);
    }
    if (overallProducts === null && !failure) {
      overallProducts = await listInventory({ page: 1, pageSize: 1, local_field_id: effectiveLocalFieldId })
        .then((r) => r.total)
        .catch(() => null);
    }
  } else if (!categoriesResult.ok) {
    failure = errorStateFromError(categoriesResult.error);
  } else {
    overallProducts = await listInventory({ page: 1, pageSize: 1, local_field_id: effectiveLocalFieldId })
      .then((r) => r.total)
      .catch(() => null);
  }

  const description =
    overallProducts !== null && categoriesResult.ok
      ? t("finding", { products: overallProducts, categories: categories.length })
      : undefined;

  const totalPages = Math.max(1, Math.ceil(productsTotal / limit));
  const filtered = Boolean(q || cat);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={description}
        actions={
          canManage ? (
            <Button asChild size="sm">
              <Link href={tab === "products" ? `${MATERIALS_CATALOG_HREF}/new` : `${MATERIALS_CATEGORIES_HREF}/new`}>
                <Plus className="size-4" />
                {tab === "products" ? t("newProduct") : t("newCategory")}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <UrlTabs
          ariaLabel={t("tabsLabel")}
          defaultValue="products"
          tabs={[
            {
              value: "products",
              label: t("tabs.products"),
              ...(overallProducts !== null ? { count: overallProducts } : {}),
            },
            {
              value: "categories",
              label: t("tabs.categories"),
              ...(categoriesResult.ok ? { count: categories.length } : {}),
            },
          ]}
        />

        {failure ? (
          <ErrorState kind={failure.kind} detail={failure.detail} retry />
        ) : tab === "products" ? (
          <>
            <CatalogFilters
              currentQ={q}
              currentCat={cat}
              categories={categories}
              currentLocalFieldId={effectiveLocalFieldId ?? null}
              localFields={localFields}
            />
            {products.length === 0 ? (
              <EmptyState
                icon={<Package className="size-6 text-muted-foreground" aria-hidden="true" />}
                title={filtered ? t("noResultsTitle") : tInv("emptyTitle")}
                description={filtered ? tInv("emptyDescriptionFiltered") : tInv("emptyDescriptionDefault")}
                variant={filtered ? "no-results" : "default"}
              >
                {filtered ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={MATERIALS_CATALOG_HREF}>{t("clearFilters")}</Link>
                  </Button>
                ) : null}
              </EmptyState>
            ) : (
              <>
                <ProductsTable
                  products={products}
                  showLocalFieldColumn={canPickField}
                  localFields={localFields}
                  canManage={canManage}
                />
                {productsTotal > 0 ? (
                  <DataTablePagination page={page} totalPages={totalPages} total={productsTotal} limit={limit} />
                ) : null}
              </>
            )}
          </>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<Tag className="size-6 text-muted-foreground" aria-hidden="true" />}
            title={tCat("emptyTitle")}
            description={tCat("emptyDescription")}
          />
        ) : (
          <CategoriesTable categorias={categories} canManage={canManage} />
        )}
      </div>
    </div>
  );
}
