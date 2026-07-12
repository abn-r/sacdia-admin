import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { V2PhaseECatalogPage } from "@/components/v2/catalogs/v2-phase-e-catalog-page";

import { ApiError } from "@/lib/api/client";
import { listAdminClasses } from "@/lib/api/phase-e-catalogs";
import { listEcclesiasticalYears } from "@/lib/api/catalogs";
import { extractItems, extractMeta, readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { CATALOGS_CREATE, CATALOGS_UPDATE, CATALOGS_DELETE, CLASSES_MANAGE } from "@/lib/auth/permissions";
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
} from "@/lib/phase-e-catalogs/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function V2AdminClassesPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("catalogs.pages.classes");
  const user = await requireAdminUser();
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let ecclesiasticalYears: Array<{ ecclesiastical_year_id: number; name: string }> = [];

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const [payload, years] = await Promise.all([
      listAdminClasses(params),
      listEcclesiasticalYears().catch(() => []),
    ]);
    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
    ecclesiasticalYears = years.map((year) => ({
      ecclesiastical_year_id: year.ecclesiastical_year_id,
      name: year.name,
    }));
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [CLASSES_MANAGE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [CLASSES_MANAGE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [CLASSES_MANAGE, CATALOGS_DELETE]);

  return (
    <V2PhaseECatalogPage
      loadError={loadError}
        title={t("title")}
        description={t("description")}
        entityLabel={t("entityLabel")}
        emptyIcon={<GraduationCap />}
        includeDescription={true}
        idField="class_id"
        nameField="name"
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createClassAction}
        updateAction={updateClassAction}
        deleteAction={deleteClassAction}
        classConfigYearOptions={ecclesiasticalYears}
      />
  );
}
