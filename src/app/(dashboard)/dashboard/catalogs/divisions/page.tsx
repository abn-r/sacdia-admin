import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DivisionsPageClient } from "@/components/catalogs/divisions/divisions-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import { listAdminDivisions } from "@/lib/api/admin-divisions";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  COUNTRIES_CREATE,
  COUNTRIES_DELETE,
  COUNTRIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import type { AdminDivision } from "@/lib/catalogs/divisions/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.divisions");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function DivisionsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs");

  let divisions: AdminDivision[] = [];
  let loadError: string | null = null;

  try {
    divisions = await listAdminDivisions();
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
    }
  }

  const canCreate = hasAnyPermission(user, [COUNTRIES_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [COUNTRIES_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [COUNTRIES_DELETE, CATALOGS_DELETE]);

  return (
    <>
      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t("errors.load_data_failed")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      <DivisionsPageClient
        divisions={divisions}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
