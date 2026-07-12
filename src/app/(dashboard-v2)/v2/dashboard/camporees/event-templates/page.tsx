import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import { listCamporeeEventTemplates } from "@/lib/api/camporee-events";
import {
  extractItems,
  extractMeta,
  readParam,
  readPositiveNumberParam,
} from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREE_EVENTS_DELETE,
  CAMPOREES_CREATE,
  CAMPOREES_UPDATE,
  CAMPOREES_DELETE,
} from "@/lib/auth/permissions";
import { deleteCamporeeEventTemplateAction } from "@/lib/camporee-events/actions";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EventTemplateListClient } from "@/components/camporee-events/event-template-list-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporeeEvents.templates");
  return { title: t("listTitle") };
}

export default async function EventTemplatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("camporeeEvents.templates");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search = readParam(raw, "search") ?? readParam(raw, "q");
  const scopeRaw = readParam(raw, "scope");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (scopeRaw && scopeRaw !== "all") params.scope = scopeRaw;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const payload = await listCamporeeEventTemplates(params);
    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE]);
  const canEdit = hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE]);
  const canDelete = hasAnyPermission(user, [CAMPOREE_EVENTS_DELETE, CAMPOREES_DELETE]);

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <EventTemplateListClient
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        deleteAction={deleteCamporeeEventTemplateAction}
      />
    </div>
  );
}
