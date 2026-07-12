import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import {
  listAdminChurches,
  listAdminDistricts,
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
  CHURCHES_CREATE,
  CHURCHES_UPDATE,
  CHURCHES_DELETE,
  CATALOGS_CREATE,
  CATALOGS_UPDATE,
  CATALOGS_DELETE,
} from "@/lib/auth/permissions";
import { deleteChurchAction } from "@/lib/generic-catalogs-i18n/actions";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { GeographyListClient } from "@/components/catalogs/geography-list-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.churches");
  return { title: t("metadataTitle") };
}

function buildDistrictMap(payload: unknown): Map<number, string> {
  const items = extractItems(payload);
  const map = new Map<number, string>();
  for (const item of items) {
    const id =
      typeof item.districlub_type_id === "number"
        ? item.districlub_type_id
        : Number(item.districlub_type_id);
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (Number.isFinite(id) && id > 0 && name) {
      map.set(id, name);
    }
  }
  return map;
}

export default async function ChurchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs.pages.churches");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search =
    readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let districtMap = new Map<number, string>();

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const [churchesPayload, districtsPayload] = await Promise.allSettled([
      listAdminChurches(params),
      listAdminDistricts(),
    ]);

    if (churchesPayload.status === "fulfilled") {
      items = extractItems(churchesPayload.value);
      meta = extractMeta(churchesPayload.value, page, limit, items.length);
    } else if (
      !(
        churchesPayload.reason instanceof ApiError &&
        churchesPayload.reason.status === 429
      )
    ) {
      loadError =
        churchesPayload.reason instanceof ApiError
          ? churchesPayload.reason.message
          : t("loadError");
    }

    if (districtsPayload.status === "fulfilled") {
      districtMap = buildDistrictMap(districtsPayload.value);
    }
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [CHURCHES_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [CHURCHES_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [CHURCHES_DELETE, CATALOGS_DELETE]);

  const enrichedItems = items.map((item) => {
    const raw = item.district_id;
    const id = typeof raw === "number" ? raw : Number(raw);
    const parentName = Number.isFinite(id)
      ? districtMap.get(id) ?? String(id)
      : "—";
    return { ...item, _parent_name: parentName };
  });

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <GeographyListClient
        i18nNamespace="churches"
        basePath="/dashboard/catalogs/geography/churches"
        pkField="church_id"
        includeAbbreviation={false}
        parentLabel={t("colDistrict")}
        parentField="_parent_name"
        fallbackName="esta iglesia"
        items={enrichedItems}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        deleteAction={deleteChurchAction}
      />
    </div>
  );
}
