import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ConfigurationFrame } from "@/components/configuration/configuration-frame";
import { EmptyState } from "@/components/shared/empty-state";
import { PageAccessForbidden } from "@/components/shared/page-access-forbidden";
import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import { requireAdminUser } from "@/lib/auth/session";
import { firstVisibleConfigurationHref } from "@/lib/configuration/rail-groups";
import { getConfigurationRailGroups } from "@/lib/configuration/rail-server";
import { CONFIGURATION_INDEX_PATH } from "@/navigation/sidebar/index-pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav.items");
  return { title: t("configuration") };
}

/**
 * The index has no content of its own: it opens the first screen the user can
 * see. Roles, audit, system and notifications have their own menu entry. With
 * nothing visible it shows an empty state inside the frame.
 */
export default async function ConfigurationPage() {
  const user = await requireAdminUser();
  // The layout hides a forbidden page but renders in parallel: gate here too.
  if (!canAccessDashboardPath(user, CONFIGURATION_INDEX_PATH)) {
    return <PageAccessForbidden />;
  }

  const groups = await getConfigurationRailGroups(user);
  const first = firstVisibleConfigurationHref(groups);
  if (first) redirect(first);

  const t = await getTranslations("admin.configuration");
  return (
    <ConfigurationFrame>
      <EmptyState icon={Settings2} title={t("rail.emptyTitle")} description={t("rail.emptyDescription")} />
    </ConfigurationFrame>
  );
}
