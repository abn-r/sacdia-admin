import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DistrictsPageClient } from "@/components/catalogs/districts/districts-page-client";
import { listAdminDistricts } from "@/lib/api/admin-districts";
import { listAdminLocalFields } from "@/lib/api/admin-local-fields";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogLoadError } from "@/components/catalogs/catalog-load-error";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AdminDistrictRow } from "@/lib/catalogs/districts/types";
import type { AdminLocalField } from "@/lib/catalogs/local-fields/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.districts");
  return {
    title: t("title"),
    description: t("description"),
  };
}

function enrichDistricts(
  districts: Awaited<ReturnType<typeof listAdminDistricts>>,
  localFields: AdminLocalField[],
): AdminDistrictRow[] {
  const localFieldMap = new Map(
    localFields.map((localField) => [localField.local_field_id, localField.name]),
  );

  return districts.map((district) => ({
    ...district,
    local_field_name:
      localFieldMap.get(district.local_field_id) ?? `#${district.local_field_id}`,
  }));
}

export default async function DistrictsPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let districts: AdminDistrictRow[] = [];
  let localFields: AdminLocalField[] = [];
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    const [districtRows, localFieldRows] = await Promise.all([
      listAdminDistricts(),
      listAdminLocalFields(),
    ]);
    localFields = localFieldRows;
    districts = enrichDistricts(districtRows, localFields);
  } catch (error) {
    loadFailure = catalogLoadFailure(error);
  }

  const canCreate = canCapability(user, "catalogs-districts", "create");
  const canEdit = canCapability(user, "catalogs-districts", "update");
  const canDelete = canCapability(user, "catalogs-districts", "delete");

  if (loadFailure) {
    return <CatalogLoadError failure={loadFailure} title={t("entities.districts.title")} description={t("entities.districts.description")} />;
  }

  return (
    <>
      <DistrictsPageClient
        districts={districts}
        localFields={localFields}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
