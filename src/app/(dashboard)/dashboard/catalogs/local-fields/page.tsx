import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LocalFieldsPageClient } from "@/components/catalogs/local-fields/local-fields-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminLocalFields } from "@/lib/api/admin-local-fields";
import { listAdminUnions } from "@/lib/api/admin-unions";
import { ApiError } from "@/lib/api/client";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  LOCAL_FIELDS_CREATE,
  LOCAL_FIELDS_DELETE,
  LOCAL_FIELDS_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import type { AdminLocalFieldRow } from "@/lib/catalogs/local-fields/types";
import type { AdminUnion } from "@/lib/catalogs/unions/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.local-fields");
  return {
    title: t("title"),
    description: t("description"),
  };
}

function enrichLocalFields(
  localFields: Awaited<ReturnType<typeof listAdminLocalFields>>,
  unions: AdminUnion[],
): AdminLocalFieldRow[] {
  const unionMap = new Map(unions.map((union) => [union.union_id, union.name]));

  return localFields.map((localField) => ({
    ...localField,
    union_name: unionMap.get(localField.union_id) ?? `#${localField.union_id}`,
  }));
}

export default async function LocalFieldsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs");

  let localFields: AdminLocalFieldRow[] = [];
  let unions: AdminUnion[] = [];
  let loadError: string | null = null;

  try {
    const [localFieldRows, unionRows] = await Promise.all([
      listAdminLocalFields(),
      listAdminUnions(),
    ]);
    unions = unionRows;
    localFields = enrichLocalFields(localFieldRows, unions);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
    }
  }

  const canCreate = hasAnyPermission(user, [LOCAL_FIELDS_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [LOCAL_FIELDS_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [LOCAL_FIELDS_DELETE, CATALOGS_DELETE]);

  return (
    <>
      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t("errors.load_data_failed")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      <LocalFieldsPageClient
        localFields={localFields}
        unions={unions}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
