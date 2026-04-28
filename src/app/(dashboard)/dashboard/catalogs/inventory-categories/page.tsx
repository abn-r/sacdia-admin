import { Package } from "lucide-react";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PhaseECatalogCrudPage } from "@/components/catalogs/phase-e-catalog-crud-page";
import { ApiError } from "@/lib/api/client";
import { listAdminInventoryCategories } from "@/lib/api/phase-e-catalogs";
import { extractItems, extractMeta, readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { CATALOGS_CREATE, CATALOGS_UPDATE, CATALOGS_DELETE, INVENTORY_CATEGORIES_MANAGE } from "@/lib/auth/permissions";
import {
  createInventoryCategoryAction,
  updateInventoryCategoryAction,
  deleteInventoryCategoryAction,
} from "@/lib/phase-e-catalogs/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminInventoryCategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const payload = await listAdminInventoryCategories(params);
    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : "No se pudieron cargar las categorías de inventario.";
    }
  }

  const canCreate = hasAnyPermission(user, [INVENTORY_CATEGORIES_MANAGE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [INVENTORY_CATEGORIES_MANAGE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [INVENTORY_CATEGORIES_MANAGE, CATALOGS_DELETE]);

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <PhaseECatalogCrudPage
        title="Categorías de inventario"
        description="Catálogo de categorías para clasificar ítems de inventario."
        entityLabel="Categoría"
        emptyIcon={Package}
        includeDescription={false}
        idField="inventory_category_id"
        nameField="name"
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createInventoryCategoryAction}
        updateAction={updateInventoryCategoryAction}
        deleteAction={deleteInventoryCategoryAction}
      />
    </div>
  );
}
