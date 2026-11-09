import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LinkIndexSections } from "@/components/shared/link-index-sections";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";
import { requireAdminUser } from "@/lib/auth/session";
import { CATALOGS_INDEX_PATH, CATALOGS_INDEX_SECTIONS } from "@/navigation/sidebar/index-pages";
import { resolveIndexSections } from "@/navigation/sidebar/index-pages-resolve";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav.items");
  return { title: t("catalogs_root") };
}

export default async function CatalogsIndexPage() {
  const user = await requireAdminUser();
  // The layout hides a forbidden page but renders in parallel: gate here too.
  if (!canAccessDashboardPath(user, CATALOGS_INDEX_PATH)) {
    return <PageAccessForbidden />;
  }

  const tNav = await getTranslations("nav");
  const sections = resolveIndexSections(
    CATALOGS_INDEX_SECTIONS,
    (link) => canAccessDashboardPath(user, link.url),
    tNav as unknown as NavTranslator,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={tNav("items.catalogs_root")}
        description={tNav("indexes.catalogsDescription")}
        breadcrumbs={[{ label: tNav("items.catalogs_root") }]}
      />
      <LinkIndexSections sections={sections} />
    </div>
  );
}
