import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LinkIndexSections, type LinkIndexCopy } from "@/components/shared/link-index-sections";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";
import { requireAdminUser } from "@/lib/auth/session";
import {
  CONFIGURATION_INDEX_PATH,
  CONFIGURATION_INDEX_SECTIONS,
} from "@/navigation/sidebar/index-pages";
import { resolveIndexSections } from "@/navigation/sidebar/index-pages-resolve";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav.items");
  return { title: t("configuration") };
}

export default async function ConfigurationPage() {
  const tNav = await getTranslations("nav");
  const tRbac = await getTranslations("rbac.pages.root");
  const tSettings = await getTranslations("settings.pages.root");
  const tAchievements = await getTranslations("achievements.crud.categories");
  const tNotifications = await getTranslations("configuration.notifications");
  const user = await requireAdminUser();
  // The layout hides a forbidden page but renders in parallel: gate here too.
  if (!canAccessDashboardPath(user, CONFIGURATION_INDEX_PATH)) {
    return <PageAccessForbidden />;
  }

  const sections = resolveIndexSections(
    CONFIGURATION_INDEX_SECTIONS,
    (link) => canAccessDashboardPath(user, link.url),
    tNav as unknown as NavTranslator,
  );

  // Cards that already had a description keep their original copy.
  const copy: LinkIndexCopy = {
    "notifications-hub": {
      title: tNotifications("title"),
      description: tNotifications("description"),
    },
    "admin-system-achievements": {
      title: tAchievements("pageTitle"),
      description: tAchievements("pageDescription"),
    },
    "admin-system-variables": {
      title: tSettings("title"),
      description: tSettings("description"),
    },
    "admin-system-permissions": {
      title: tRbac("sectionPermissions"),
      description: tRbac("sectionPermissionsDesc"),
    },
    "admin-system-roles": {
      title: tRbac("sectionRoles"),
      description: tRbac("sectionRolesDesc"),
    },
    "admin-system-matrix": {
      title: tRbac("sectionMatrix"),
      description: tRbac("sectionMatrixDesc"),
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tNav("items.configuration")}
        description={tNav("indexes.configurationDescription")}
        breadcrumbs={[{ label: tNav("items.configuration") }]}
      />
      <LinkIndexSections sections={sections} copy={copy} />
    </div>
  );
}
