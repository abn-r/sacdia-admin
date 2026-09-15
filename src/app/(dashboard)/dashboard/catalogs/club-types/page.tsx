import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ClubTypesPageClient } from "@/components/catalogs/club-types/club-types-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import { ApiError } from "@/lib/api/client";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
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
  let loadError: string | null = null;

  try {
    clubTypes = await listAdminClubTypes();
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
    }
  }

  const canCreate = canCapability(user, "catalogs-club-types", "create");
  const canEdit = canCapability(user, "catalogs-club-types", "update");
  const canDelete = canCapability(user, "catalogs-club-types", "delete");

  return (
    <>
      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t("errors.load_data_failed")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      <ClubTypesPageClient
        clubTypes={clubTypes}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
