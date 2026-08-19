import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ClubIdealsPageClient } from "@/components/catalogs/club-ideals/club-ideals-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminClubIdeals } from "@/lib/api/admin-club-ideals";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import { ApiError } from "@/lib/api/client";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  CLUB_IDEALS_CREATE,
  CLUB_IDEALS_DELETE,
  CLUB_IDEALS_UPDATE,
} from "@/lib/auth/permissions";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import type { AdminClubIdealRow } from "@/lib/catalogs/club-ideals/types";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";
import { sortClubIdealsByTypeAndOrder } from "@/lib/catalogs/club-ideals/sort";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.club-ideals");
  return {
    title: t("title"),
    description: t("description"),
  };
}

function enrichClubIdeals(
  clubIdeals: Awaited<ReturnType<typeof listAdminClubIdeals>>,
  clubTypes: AdminClubType[],
): AdminClubIdealRow[] {
  const clubTypeMap = new Map(
    clubTypes.map((clubType) => [clubType.club_type_id, clubType.name]),
  );

  return sortClubIdealsByTypeAndOrder(
    clubIdeals.map((clubIdeal) => ({
      ...clubIdeal,
      club_type_name: clubTypeMap.get(clubIdeal.club_type_id) ?? `#${clubIdeal.club_type_id}`,
    })),
    clubTypes,
  );
}

export default async function ClubIdealsPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let clubIdeals: AdminClubIdealRow[] = [];
  let clubTypes: AdminClubType[] = [];
  let loadError: string | null = null;

  try {
    const [ideals, types] = await Promise.all([
      listAdminClubIdeals(),
      listAdminClubTypes(),
    ]);
    clubTypes = types;
    clubIdeals = enrichClubIdeals(ideals, types);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
    }
  }

  const canCreate = hasAnyPermission(user, [CLUB_IDEALS_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [CLUB_IDEALS_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [CLUB_IDEALS_DELETE, CATALOGS_DELETE]);

  return (
    <>
      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t("errors.load_data_failed")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      <ClubIdealsPageClient
        clubIdeals={clubIdeals}
        clubTypes={clubTypes}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
