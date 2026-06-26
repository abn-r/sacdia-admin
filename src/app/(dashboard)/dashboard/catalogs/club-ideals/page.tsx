import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import { listAdminClubIdeals } from "@/lib/api/generic-catalogs-i18n";
import { extractItems, extractMeta, readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CLUB_IDEALS_CREATE,
  CLUB_IDEALS_UPDATE,
  CLUB_IDEALS_DELETE,
  CATALOGS_CREATE,
  CATALOGS_UPDATE,
  CATALOGS_DELETE,
} from "@/lib/auth/permissions";
import { deleteClubIdealAction } from "@/lib/generic-catalogs-i18n/actions";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ClubIdealListClient } from "@/components/catalogs/club-ideal-list-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.clubIdeals");
  return { title: t("metadataTitle") };
}

export default async function ClubIdealsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs.pages.clubIdeals");
  const raw = await searchParams;

  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search =
    readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");

  let items: Record<string, unknown>[] = [];
  let meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;

  try {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (search) params.search = search;
    if (activeRaw === "true") params.active = true;
    if (activeRaw === "false") params.active = false;

    const payload = await listAdminClubIdeals(params);
    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError =
        error instanceof ApiError ? error.message : t("loadError");
    }
  }

  const canCreate = hasAnyPermission(user, [CLUB_IDEALS_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [CLUB_IDEALS_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [CLUB_IDEALS_DELETE, CATALOGS_DELETE]);

  return (
    <div className="space-y-6">
      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}
      <ClubIdealListClient
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        deleteAction={deleteClubIdealAction}
      />
    </div>
  );
}
