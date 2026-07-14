import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ClubTypesPageClient } from "@/components/catalogs/club-types/club-types-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import { ApiError } from "@/lib/api/client";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  CLUB_TYPES_CREATE,
  CLUB_TYPES_DELETE,
  CLUB_TYPES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import type { AdminClubType } from "@/lib/catalogs/club-types/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.club-types");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ClubTypesPage() {
  const user = await requireAdminUser();
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

  const canCreate = hasAnyPermission(user, [CLUB_TYPES_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [CLUB_TYPES_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [CLUB_TYPES_DELETE, CATALOGS_DELETE]);

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
