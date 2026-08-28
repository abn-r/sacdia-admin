import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HonorsPageClient } from "@/components/catalogs/honors/honors-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminClubTypes } from "@/lib/api/admin-club-types";
import { listAdminHonorCategories } from "@/lib/api/admin-honor-categories";
import { listAdminHonorsCatalog } from "@/lib/api/admin-honors-catalog";
import { ApiError } from "@/lib/api/client";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  HONORS_CREATE,
  HONORS_DELETE,
  HONORS_UPDATE,
} from "@/lib/auth/permissions";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import type { AdminClubType } from "@/lib/api/admin-club-types";
import { normalizeHonorCategoryRow, type AdminHonorCategoryRow } from "@/lib/catalogs/honor-categories/types";
import type { AdminHonorRow } from "@/lib/catalogs/honors/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.honors");
  return {
    title: t("title"),
    description: t("description"),
  };
}

function enrichHonors(
  honors: Awaited<ReturnType<typeof listAdminHonorsCatalog>>,
  categoryMap: Map<number, string>,
  clubTypeMap: Map<number, string>,
): AdminHonorRow[] {
  return honors.map((honor) => ({
    ...honor,
    honor_category_name:
      categoryMap.get(honor.honors_category_id) ?? `#${honor.honors_category_id}`,
    club_type_name: clubTypeMap.get(honor.club_type_id) ?? `#${honor.club_type_id}`,
  }));
}

export default async function HonorsPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let honors: AdminHonorRow[] = [];
  let categories: AdminHonorCategoryRow[] = [];
  let clubTypes: AdminClubType[] = [];
  let loadError: string | null = null;

  try {
    const [honorRows, categoryResult, clubTypeRows] = await Promise.all([
      listAdminHonorsCatalog(),
      listAdminHonorCategories({ page: 1, limit: 100 }),
      listAdminClubTypes(),
    ]);

    categories = categoryResult.items.map(normalizeHonorCategoryRow);
    clubTypes = clubTypeRows;

    const categoryMap = new Map(
      categories.map((category) => [category.honor_category_id, category.name]),
    );
    const clubTypeMap = new Map(
      clubTypes.map((clubType) => [clubType.club_type_id, clubType.name]),
    );

    honors = enrichHonors(honorRows, categoryMap, clubTypeMap);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
    }
  }

  const canCreate = hasAnyPermission(user, [HONORS_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [HONORS_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [HONORS_DELETE, CATALOGS_DELETE]);

  return (
    <>
      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t("errors.load_data_failed")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      <HonorsPageClient
        honors={honors}
        categories={categories}
        clubTypes={clubTypes}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
