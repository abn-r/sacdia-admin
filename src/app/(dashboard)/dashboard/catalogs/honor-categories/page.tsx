import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HonorCategoriesPageClient } from "@/components/catalogs/honor-categories/honor-categories-page-client";
import { listAdminHonorCategories } from "@/lib/api/admin-honor-categories";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogLoadError } from "@/components/catalogs/catalog-load-error";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import {
  normalizeHonorCategoryRow,
  type AdminHonorCategoryRow,
} from "@/lib/catalogs/honor-categories/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.honor-categories");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HonorCategoriesPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let categories: AdminHonorCategoryRow[] = [];
  let loadFailure: CatalogLoadFailure | null = null;

  if (!canViewScreen(user, "catalogs-honor-categories")) {
    loadFailure = { kind: "forbidden" };
  } else {
    try {
      const result = await listAdminHonorCategories({ page: 1, limit: 100 });
      categories = result.items.map(normalizeHonorCategoryRow);
    } catch (error) {
      loadFailure = catalogLoadFailure(error);
    }
  }

  const canCreate = canCapability(user, "catalogs-honor-categories", "create");
  const canEdit = canCapability(user, "catalogs-honor-categories", "update");
  const canDelete = canCapability(user, "catalogs-honor-categories", "delete");

  if (loadFailure) {
    return <CatalogLoadError failure={loadFailure} title={t("entities.honor-categories.title")} description={t("entities.honor-categories.description")} />;
  }

  return (
    <>
      <HonorCategoriesPageClient
        categories={categories}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
