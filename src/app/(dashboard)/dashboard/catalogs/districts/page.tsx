import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DistrictsPageClient } from "@/components/catalogs/districts/districts-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminDistricts } from "@/lib/api/admin-districts";
import { listAdminLocalFields } from "@/lib/api/admin-local-fields";
import { ApiError } from "@/lib/api/client";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  DISTRICTS_CREATE,
  DISTRICTS_DELETE,
  DISTRICTS_UPDATE,
  LOCAL_FIELDS_DELETE,
  LOCAL_FIELDS_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
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
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs");

  let districts: AdminDistrictRow[] = [];
  let localFields: AdminLocalField[] = [];
  let loadError: string | null = null;

  try {
    const [districtRows, localFieldRows] = await Promise.all([
      listAdminDistricts(),
      listAdminLocalFields(),
    ]);
    localFields = localFieldRows;
    districts = enrichDistricts(districtRows, localFields);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
    }
  }

  const canCreate = hasAnyPermission(user, [
    DISTRICTS_CREATE,
    LOCAL_FIELDS_UPDATE,
    CATALOGS_CREATE,
  ]);
  const canEdit = hasAnyPermission(user, [
    DISTRICTS_UPDATE,
    LOCAL_FIELDS_UPDATE,
    CATALOGS_UPDATE,
  ]);
  const canDelete = hasAnyPermission(user, [
    DISTRICTS_DELETE,
    LOCAL_FIELDS_DELETE,
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
