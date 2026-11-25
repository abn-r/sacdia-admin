import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ClubTypesPageClient } from "@/components/catalogs/club-types/club-types-page-client";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogLoadError } from "@/components/catalogs/catalog-load-error";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.club-types");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ClubTypesPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let clubTypes: AdminClubType[] = [];
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    clubTypes = await listAdminClubTypes();
  } catch (error) {
    loadFailure = catalogLoadFailure(error);
  }

  const canCreate = canCapability(user, "catalogs-club-types", "create");
  const canEdit = canCapability(user, "catalogs-club-types", "update");
  const canDelete = canCapability(user, "catalogs-club-types", "delete");

  if (loadFailure) {
    return <CatalogLoadError failure={loadFailure} title={t("entities.club-types.title")} description={t("entities.club-types.description")} />;
  }

  return (
    <>
      <ClubTypesPageClient
        clubTypes={clubTypes}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
