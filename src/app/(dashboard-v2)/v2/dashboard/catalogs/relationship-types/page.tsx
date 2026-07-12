import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { V2PhaseECatalogPage } from "@/components/v2/catalogs/v2-phase-e-catalog-page";

import { ApiError } from "@/lib/api/client";
import { listAdminRelationshipTypes } from "@/lib/api/generic-catalogs-i18n";
import { extractItems, extractMeta, readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  RELATIONSHIP_TYPES_CREATE,
  RELATIONSHIP_TYPES_UPDATE,
  RELATIONSHIP_TYPES_DELETE,
  CATALOGS_CREATE,
  CATALOGS_UPDATE,
  CATALOGS_DELETE,
} from "@/lib/auth/permissions";
import {
  createRelationshipTypeAction,
  updateRelationshipTypeAction,
  deleteRelationshipTypeAction,
} from "@/lib/generic-catalogs-i18n/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function V2RelationshipTypesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs.pages.relationshipTypes");
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

    const payload = await listAdminRelationshipTypes(params);
    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [RELATIONSHIP_TYPES_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [RELATIONSHIP_TYPES_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [RELATIONSHIP_TYPES_DELETE, CATALOGS_DELETE]);

  return (
    <V2PhaseECatalogPage
      loadError={loadError}
        title={t("title")}
        description={t("description")}
        entityLabel={t("entityLabel")}
        emptyIcon={<Users />}
        includeDescription={true}
        idField="relationship_type_id"
        nameField="name"
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createRelationshipTypeAction}
        updateAction={updateRelationshipTypeAction}
        deleteAction={deleteRelationshipTypeAction}
      />
  );
}
