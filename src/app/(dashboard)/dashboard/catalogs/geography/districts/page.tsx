import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import {
  listAdminDistricts,
  listAdminLocalFields,
} from "@/lib/api/generic-catalogs-i18n";
import {
  extractItems,
  extractMeta,
  readParam,
  readPositiveNumberParam,
} from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  DISTRICTS_CREATE,
  DISTRICTS_UPDATE,
  DISTRICTS_DELETE,
  CATALOGS_CREATE,
  CATALOGS_UPDATE,
  CATALOGS_DELETE,
} from "@/lib/auth/permissions";
import { deleteDistrictAction } from "@/lib/generic-catalogs-i18n/actions";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { GeographyListClient } from "@/components/catalogs/geography-list-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.districts");
  return { title: t("metadataTitle") };
}

function buildLocalFieldMap(payload: unknown): Map<number, string> {
  const items = extractItems(payload);
  const map = new Map<number, string>();
  for (const item of items) {
    const id =
      typeof item.local_field_id === "number"
        ? item.local_field_id
        : Number(item.local_field_id);
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (Number.isFinite(id) && id > 0 && name) {
      map.set(id, name);
    }
  }
  return map;
}

export default async function DistrictsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs.pages.districts");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search =
    readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let localFieldMap = new Map<number, string>();

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const [districtsPayload, localFieldsPayload] = await Promise.allSettled([
      listAdminDistricts(params),
      listAdminLocalFields(),
    ]);

    if (districtsPayload.status === "fulfilled") {
      const rawItems = extractItems(districtsPayload.value);
      meta = extractMeta(districtsPayload.value, page, limit, rawItems.length);
      // Server-side parent resolution — RSC cannot send functions to the client.
      items = rawItems;
    } else if (
      !(
        districtsPayload.reason instanceof ApiError &&
        districtsPayload.reason.status === 429
      )
    ) {
      loadError =
        districtsPayload.reason instanceof ApiError
          ? districtsPayload.reason.message
          : t("loadError");
    }

    if (localFieldsPayload.status === "fulfilled") {
      localFieldMap = buildLocalFieldMap(localFieldsPayload.value);
    }
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [DISTRICTS_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [DISTRICTS_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [DISTRICTS_DELETE, CATALOGS_DELETE]);

  const enrichedItems = items.map((item) => {
    const raw = item.local_field_id;
    const id = typeof raw === "number" ? raw : Number(raw);
    const parentName = Number.isFinite(id)
      ? localFieldMap.get(id) ?? String(id)
      : "—";
    return { ...item, _parent_name: parentName };
  });

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <GeographyListClient
        i18nNamespace="districts"
        basePath="/dashboard/catalogs/geography/districts"
        pkField="districlub_type_id"
        includeAbbreviation={false}
        parentLabel={t("colLocalField")}
        parentField="_parent_name"
        fallbackName="este distrito"
        items={enrichedItems}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        deleteAction={deleteDistrictAction}
      />
    </div>
  );
}
