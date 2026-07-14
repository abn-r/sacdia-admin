import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HonorCategoriesPageClient } from "@/components/catalogs/honor-categories/honor-categories-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminHonorCategories } from "@/lib/api/admin-honor-categories";
import { ApiError } from "@/lib/api/client";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_READ,
  CATALOGS_UPDATE,
  HONOR_CATEGORIES_CREATE,
  HONOR_CATEGORIES_DELETE,
  HONOR_CATEGORIES_READ,
  HONOR_CATEGORIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
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
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs");

  let categories: AdminHonorCategoryRow[] = [];
  let loadError: string | null = null;

  if (!hasAnyPermission(user, [HONOR_CATEGORIES_READ, CATALOGS_READ])) {
    loadError = t("honorCategories.noPermissions");
  } else {
    try {
      const result = await listAdminHonorCategories({ page: 1, limit: 100 });
      categories = result.items.map(normalizeHonorCategoryRow);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 429)) {
        loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
      }
    }
  }

  const canCreate = hasAnyPermission(user, [HONOR_CATEGORIES_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [HONOR_CATEGORIES_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [HONOR_CATEGORIES_DELETE, CATALOGS_DELETE]);

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
