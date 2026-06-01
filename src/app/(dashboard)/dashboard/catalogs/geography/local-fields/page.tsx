import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import {
  listAdminLocalFields,
  listAdminUnions,
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
  LOCAL_FIELDS_CREATE,
  LOCAL_FIELDS_UPDATE,
  LOCAL_FIELDS_DELETE,
  CATALOGS_CREATE,
  CATALOGS_UPDATE,
  CATALOGS_DELETE,
} from "@/lib/auth/permissions";
import { deleteLocalFieldAction } from "@/lib/generic-catalogs-i18n/actions";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { GeographyListClient } from "@/components/catalogs/geography-list-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.localFields");
  return { title: t("metadataTitle") };
}

function buildUnionMap(payload: unknown): Map<number, string> {
  const items = extractItems(payload);
  const map = new Map<number, string>();
  for (const item of items) {
    const id =
      typeof item.union_id === "number" ? item.union_id : Number(item.union_id);
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (Number.isFinite(id) && id > 0 && name) {
      map.set(id, name);
    }
  }
  return map;
}

export default async function LocalFieldsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs.pages.localFields");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search =
    readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let unionMap = new Map<number, string>();

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const [localFieldsPayload, unionsPayload] = await Promise.allSettled([
      listAdminLocalFields(params),
      listAdminUnions(),
    ]);

    if (localFieldsPayload.status === "fulfilled") {
      items = extractItems(localFieldsPayload.value);
      meta = extractMeta(localFieldsPayload.value, page, limit, items.length);
    } else if (
      !(
        localFieldsPayload.reason instanceof ApiError &&
        localFieldsPayload.reason.status === 429
      )
    ) {
      loadError =
        localFieldsPayload.reason instanceof ApiError
          ? localFieldsPayload.reason.message
          : t("loadError");
    }

    if (unionsPayload.status === "fulfilled") {
      unionMap = buildUnionMap(unionsPayload.value);
    }
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [
    LOCAL_FIELDS_CREATE,
    CATALOGS_CREATE,
  ]);
  const canEdit = hasAnyPermission(user, [LOCAL_FIELDS_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [
    LOCAL_FIELDS_DELETE,
    CATALOGS_DELETE,
  ]);

  const enrichedItems = items.map((item) => {
    const raw = item.union_id;
    const id = typeof raw === "number" ? raw : Number(raw);
    const parentName = Number.isFinite(id)
      ? unionMap.get(id) ?? String(id)
      : "—";
    return { ...item, _parent_name: parentName };
  });

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <GeographyListClient
        i18nNamespace="localFields"
        basePath="/dashboard/catalogs/geography/local-fields"
        pkField="local_field_id"
        includeAbbreviation
        parentLabel={t("colUnion")}
        parentField="_parent_name"
        fallbackName="este campo local"
        items={enrichedItems}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        deleteAction={deleteLocalFieldAction}
        enableScoringConfiguration
      />
    </div>
  );
}
