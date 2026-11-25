import type { Metadata } from "next";
import { DollarSign } from "lucide-react";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const PhaseECatalogCrudPage = dynamic(
  () =>
    import("@/components/catalogs/phase-e-catalog-crud-page").then((m) => ({
      default: m.PhaseECatalogCrudPage,
    })),
  {
    loading: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    ),
  }
);
import { listAdminFinanceCategories } from "@/lib/api/phase-e-catalogs";
import { extractItems, readParam, readPositiveNumberParam, paginateLoadedItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogLoadError } from "@/components/catalogs/catalog-load-error";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability } from "@/lib/auth/screen-catalog";
import {
  FINANCE_CATEGORY_TYPE_EXPENSE,
  FINANCE_CATEGORY_TYPE_INCOME,
} from "@/lib/phase-e-catalogs/finance-category-type";
import {
  createFinanceCategoryAction,
  updateFinanceCategoryAction,
  deleteFinanceCategoryAction,
} from "@/lib/phase-e-catalogs/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.financeCategories");
  return { title: t("title") };
}

export default async function AdminFinanceCategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs.pages.financeCategories");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const payload = await listAdminFinanceCategories(params);
    items = extractItems(payload);
    ({ items, meta } = paginateLoadedItems(items, payload, page, limit));
  } catch (error) {
    loadFailure = catalogLoadFailure(error);
  }

  const canCreate = canCapability(user, "catalogs-finance-categories", "create");
  const canEdit = canCapability(user, "catalogs-finance-categories", "update");
  const canDelete = canCapability(user, "catalogs-finance-categories", "delete");

  if (loadFailure) {
    return <CatalogLoadError failure={loadFailure} title={t("title")} description={t("description")} />;
  }

  return (
    <div className="space-y-6">
      <PhaseECatalogCrudPage
        title={t("title")}
        description={t("description")}
        entityLabel={t("entityLabel")}
        emptyIcon={<DollarSign />}
        includeDescription={false}
        typeField={{
          name: "type",
          label: t("typeLabel"),
          placeholder: t("typePlaceholder"),
          options: [
            { value: String(FINANCE_CATEGORY_TYPE_INCOME), label: t("typeIncome") },
            { value: String(FINANCE_CATEGORY_TYPE_EXPENSE), label: t("typeExpense") },
          ],
        }}
        idField="finance_category_id"
        nameField="name"
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createFinanceCategoryAction}
        updateAction={updateFinanceCategoryAction}
        deleteAction={deleteFinanceCategoryAction}
      />
    </div>
  );
}
