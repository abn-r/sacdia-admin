import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ChurchesPageClient } from "@/components/catalogs/churches/churches-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminChurches } from "@/lib/api/admin-churches";
import { listAdminDistricts } from "@/lib/api/admin-districts";
import { ApiError } from "@/lib/api/client";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  CHURCHES_CREATE,
  CHURCHES_DELETE,
  CHURCHES_UPDATE,
  DISTRICTS_DELETE,
  DISTRICTS_UPDATE,
} from "@/lib/auth/permissions";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import type { AdminChurchRow } from "@/lib/catalogs/churches/types";
import type { AdminDistrict } from "@/lib/catalogs/districts/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.churches");
  return {
    title: t("title"),
    description: t("description"),
  };
}

function enrichChurches(
  churches: Awaited<ReturnType<typeof listAdminChurches>>,
  districts: AdminDistrict[],
): AdminChurchRow[] {
  const districtMap = new Map(
    districts.map((district) => [district.district_id, district.name]),
  );

  return churches.map((church) => ({
    ...church,
    district_name: districtMap.get(church.district_id) ?? `#${church.district_id}`,
  }));
}

export default async function ChurchesPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let churches: AdminChurchRow[] = [];
  let districts: AdminDistrict[] = [];
  let loadError: string | null = null;

  try {
    const [churchRows, districtRows] = await Promise.all([
      listAdminChurches(),
      listAdminDistricts(),
    ]);
    districts = districtRows;
    churches = enrichChurches(churchRows, districts);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
    }
  }

  const canCreate = hasAnyPermission(user, [
    CHURCHES_CREATE,
    DISTRICTS_UPDATE,
    CATALOGS_CREATE,
  ]);
  const canEdit = hasAnyPermission(user, [
    CHURCHES_UPDATE,
    DISTRICTS_UPDATE,
    CATALOGS_UPDATE,
  ]);
  const canDelete = hasAnyPermission(user, [
    CHURCHES_DELETE,
    DISTRICTS_DELETE,
    CATALOGS_DELETE,
  ]);

  return (
    <>
      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t("errors.load_data_failed")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      <ChurchesPageClient
        churches={churches}
        districts={districts}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
