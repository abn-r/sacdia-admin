import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ClubIdealsPageClient } from "@/components/catalogs/club-ideals/club-ideals-page-client";
import { listAdminClubIdeals } from "@/lib/api/admin-club-ideals";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogLoadError } from "@/components/catalogs/catalog-load-error";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability } from "@/lib/auth/screen-catalog";
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
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    const [ideals, types] = await Promise.all([
      listAdminClubIdeals(),
      listAdminClubTypes(),
    ]);
    clubTypes = types;
    clubIdeals = enrichClubIdeals(ideals, types);
  } catch (error) {
    loadFailure = catalogLoadFailure(error);
  }

  const canCreate = canCapability(user, "catalogs-club-ideals", "create");
  const canEdit = canCapability(user, "catalogs-club-ideals", "update");
  const canDelete = canCapability(user, "catalogs-club-ideals", "delete");

  if (loadFailure) {
    return <CatalogLoadError failure={loadFailure} title={t("entities.club-ideals.title")} description={t("entities.club-ideals.description")} />;
  }

  return (
    <>
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
