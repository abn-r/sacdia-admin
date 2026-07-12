import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { V2PhaseECatalogPage } from "@/components/v2/catalogs/v2-phase-e-catalog-page";

import { ApiError } from "@/lib/api/client";
import { listAdminHonorsCatalog, listAdminMasterHonors } from "@/lib/api/phase-e-catalogs";
import { listDivisions } from "@/lib/api/geography";
import { listHonorCategoriesAdmin } from "@/lib/api/honor-categories";
import { extractItems, extractMeta, readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { CATALOGS_CREATE, CATALOGS_UPDATE, CATALOGS_DELETE, MASTER_HONORS_MANAGE } from "@/lib/auth/permissions";
import {
  createMasterHonorAction,
  updateMasterHonorAction,
  deleteMasterHonorAction,
  recalculateMasterHonorAction,
} from "@/lib/phase-e-catalogs/actions";
import type {
  MasterHonorAuxCategory,
  MasterHonorAuxDivision,
  MasterHonorAuxHonor,
} from "@/components/catalogs/master-honor-rules-editor";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function V2AdminMasterHonorsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs.pages.masterHonors");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let masterHonorsConfig:
    | {
        honors: MasterHonorAuxHonor[];
        honorCategories: MasterHonorAuxCategory[];
        divisions: MasterHonorAuxDivision[];
        recalculateAction: typeof recalculateMasterHonorAction;
      }
    | null = null;

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const payload = await listAdminMasterHonors(params);

    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  try {
    const [honorsPayload, honorCategoriesPayload, divisionsPayload] = await Promise.all([
      listAdminHonorsCatalog(),
      listHonorCategoriesAdmin({ page: 1, limit: 100 }),
      listDivisions(),
    ]);

    const honors = extractItems(honorsPayload);
    const honorCategories = extractItems(honorCategoriesPayload);
    const divisions = extractItems(divisionsPayload);

    masterHonorsConfig = {
      honors: honors
        .map((honor) => ({
          honor_id: Number(honor.honor_id),
          name: typeof honor.name === "string" ? honor.name : `#${honor.honor_id}`,
        }))
        .filter((honor) => Number.isFinite(honor.honor_id) && honor.honor_id > 0),
      honorCategories: honorCategories
        .map((category) => ({
          honor_category_id: Number(category.honor_category_id ?? category.category_id),
          name: typeof category.name === "string" ? category.name : `#${category.honor_category_id ?? category.category_id}`,
        }))
        .filter(
          (category) => Number.isFinite(category.honor_category_id) && category.honor_category_id > 0,
        ),
      divisions: divisions
        .map((division) => ({
          division_id: Number(division.division_id),
          name: typeof division.name === "string" ? division.name : `#${division.division_id}`,
        }))
        .filter((division) => Number.isFinite(division.division_id) && division.division_id > 0),
      recalculateAction: recalculateMasterHonorAction,
    };
  } catch (error) {
    masterHonorsConfig = {
      honors: [],
      honorCategories: [],
      divisions: [],
      recalculateAction: recalculateMasterHonorAction,
    };

    if (!loadError && !(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [MASTER_HONORS_MANAGE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [MASTER_HONORS_MANAGE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [MASTER_HONORS_MANAGE, CATALOGS_DELETE]);

  return (
    <V2PhaseECatalogPage
      loadError={loadError}
        title={t("title")}
        description={t("description")}
        entityLabel={t("entityLabel")}
        emptyIcon={<Star />}
        includeDescription={true}
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
        masterHonorsConfig={masterHonorsConfig ?? undefined}
      />
  );
}
