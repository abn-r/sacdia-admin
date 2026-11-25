import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DivisionsPageClient } from "@/components/catalogs/divisions/divisions-page-client";
import { listAdminDivisions } from "@/lib/api/admin-divisions";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogLoadError } from "@/components/catalogs/catalog-load-error";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AdminDivision } from "@/lib/catalogs/divisions/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.divisions");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function DivisionsPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let divisions: AdminDivision[] = [];
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    divisions = await listAdminDivisions();
  } catch (error) {
    loadFailure = catalogLoadFailure(error);
  }

  const canCreate = canCapability(user, "catalogs-divisions", "create");
  const canEdit = canCapability(user, "catalogs-divisions", "update");
  const canDelete = canCapability(user, "catalogs-divisions", "delete");

  if (loadFailure) {
    return <CatalogLoadError failure={loadFailure} title={t("entities.divisions.title")} description={t("entities.divisions.description")} />;
  }

  return (
    <>
      <DivisionsPageClient
        divisions={divisions}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
