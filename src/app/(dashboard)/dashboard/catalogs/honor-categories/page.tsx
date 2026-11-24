import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HonorCategoriesPageClient } from "@/components/catalogs/honor-categories/honor-categories-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminHonorCategories } from "@/lib/api/admin-honor-categories";
import { ApiError } from "@/lib/api/client";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogRateLimited } from "@/components/catalogs/catalog-rate-limited";
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
  let loadError: string | null = null;
  let rateLimited = false;

  if (!canViewScreen(user, "catalogs-honor-categories")) {
    loadError = t("honorCategories.noPermissions");
  } else {
    try {
      const result = await listAdminHonorCategories({ page: 1, limit: 100 });
      categories = result.items.map(normalizeHonorCategoryRow);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        rateLimited = true;
      } else {
        loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
      }
    }
  }

  const canCreate = canCapability(user, "catalogs-honor-categories", "create");
  const canEdit = canCapability(user, "catalogs-honor-categories", "update");
  const canDelete = canCapability(user, "catalogs-honor-categories", "delete");

  if (rateLimited) {
    return <CatalogRateLimited title={t("entities.honor-categories.title")} description={t("entities.honor-categories.description")} breadcrumbs={[{ label: t("entities.honor-categories.title") }]} />;
  }

  return (
    <>
      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t("errors.load_data_failed")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      <HonorCategoriesPageClient
        categories={categories}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
