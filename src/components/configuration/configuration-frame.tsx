import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/shared/page-header";
import { RailLayout } from "@/components/shared/rail-layout";
import { requireAdminUser } from "@/lib/auth/session";
import { getConfigurationRailGroups } from "@/lib/configuration/rail-server";

/**
 * Configuración frame: title plus the grouped rail on the left and the selected
 * screen on the right. Shared by every screen of the rail, including the ones
 * that live outside `/dashboard/configuration` (each wraps itself in a layout).
 */
export async function ConfigurationFrame({ children }: { children: ReactNode }) {
  const user = await requireAdminUser();
  const [tNav, t, groups] = await Promise.all([
    getTranslations("nav"),
    getTranslations("admin.configuration"),
    getConfigurationRailGroups(user),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={tNav("items.configuration")} description={t("rail.description")} />
      <RailLayout groups={groups} ariaLabel={t("rail.ariaLabel")}>
        {children}
      </RailLayout>
    </div>
  );
}
