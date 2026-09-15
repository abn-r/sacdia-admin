import { Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";

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
import { listAdminHonorCategories } from "@/lib/api/admin-honor-categories";
import { listAdminHonorsCatalog } from "@/lib/api/admin-honors-catalog";
import { listAdminDivisions } from "@/lib/api/admin-divisions";
import { ApiError } from "@/lib/api/client";
import { listAdminMasterHonors } from "@/lib/api/phase-e-catalogs";
import { extractItems, extractMeta, readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import {
  createMasterHonorAction,
  updateMasterHonorAction,
  deleteMasterHonorAction,
  recalculateMasterHonorAction,
} from "@/lib/phase-e-catalogs/actions";
import type { MasterHonorAuxCategory, MasterHonorAuxDivision, MasterHonorAuxHonor } from "@/components/catalogs/master-honor-rules-editor";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminMasterHonorsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "catalogs-master-honors")) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs.pages.masterHonors");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let honors: MasterHonorAuxHonor[] = [];
  let honorCategories: MasterHonorAuxCategory[] = [];
  let divisions: MasterHonorAuxDivision[] = [];

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const [payload, honorsResult, categoriesResult, divisionsResult] = await Promise.all([
      listAdminMasterHonors(params),
      listAdminHonorsCatalog().then(
        (rows) => rows,
        () => [] as Awaited<ReturnType<typeof listAdminHonorsCatalog>>,
      ),
      listAdminHonorCategories({ page: 1, limit: 200 }).then(
        (result) => result,
        () => ({ items: [] as Awaited<ReturnType<typeof listAdminHonorCategories>>["items"] }),
      ),
      listAdminDivisions().then(
        (rows) => rows,
        () => [] as Awaited<ReturnType<typeof listAdminDivisions>>,
      ),
    ]);

    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
    honors = honorsResult.map((honor) => ({ honor_id: honor.honor_id, name: honor.name }));
    honorCategories = categoriesResult.items.map((category) => ({
      honor_category_id: category.honor_category_id,
      name: category.name,
    }));
    divisions = divisionsResult.map((division) => ({
      division_id: division.division_id,
      name: division.name,
    }));
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = canCapability(user, "catalogs-master-honors", "create");
  const canEdit = canCapability(user, "catalogs-master-honors", "update");
  const canDelete = canCapability(user, "catalogs-master-honors", "delete");

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <PhaseECatalogCrudPage
        title={t("title")}
        description={t("description")}
        entityLabel={t("entityLabel")}
        emptyIcon={<Trophy />}
        includeDescription={false}
        idField="master_honor_id"
        nameField="name"
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createMasterHonorAction}
        updateAction={updateMasterHonorAction}
        deleteAction={deleteMasterHonorAction}
        masterHonorsConfig={{
          honors,
          honorCategories,
          divisions,
          recalculateAction: recalculateMasterHonorAction,
        }}
      />
    </div>
  );
}
