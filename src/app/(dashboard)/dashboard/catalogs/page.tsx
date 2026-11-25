import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/shared/empty-state";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import { requireAdminUser } from "@/lib/auth/session";
import { firstVisibleCatalogHref } from "@/lib/catalogs/rail-groups";
import { getCatalogRailGroups } from "@/lib/catalogs/rail-server";
import { CATALOGS_INDEX_PATH } from "@/navigation/sidebar/index-pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav.items");
  return { title: t("catalogs_root") };
}

/**
 * The index has no content of its own: it opens the first catalog the user can
 * see (the rail from the layout stays on the left). With no visible catalog it
 * shows an empty state.
 */
export default async function CatalogsIndexPage() {
  const user = await requireAdminUser();
  // The layout hides a forbidden page but renders in parallel: gate here too.
  if (!canAccessDashboardPath(user, CATALOGS_INDEX_PATH)) {
    return <PageAccessForbidden />;
  }

  const groups = await getCatalogRailGroups(user);
  const first = firstVisibleCatalogHref(groups);
  if (first) redirect(first);

  const t = await getTranslations("admin.catalogs");
  return (
    <EmptyState icon={Package} title={t("rail.emptyTitle")} description={t("rail.emptyDescription")} />
  );
}
