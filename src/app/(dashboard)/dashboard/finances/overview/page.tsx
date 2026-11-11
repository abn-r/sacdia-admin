import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { FinancesOverview } from "@/components/finances/finances-overview";
import { FinancesViewSwitcher } from "@/components/finances/finances-view-switcher";
import {
  getActiveEcclesiasticalYearId,
  listEcclesiasticalYears,
} from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import { requireAdminUser } from "@/lib/auth/session";
import {
  canAdminFilterByLocalField,
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { canViewFinancesOverview } from "@/lib/finances/overview-access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("finances.overview");
  return { title: t("title") };
}

export default async function FinancesOverviewPage() {
  const user = await requireAdminUser();
  // Club roles would get 403 from the API: send them to the per-club view.
  if (!canViewFinancesOverview(user)) {
    redirect("/dashboard/finances");
  }
  const t = await getTranslations("finances.overview");
  const territoryScope = resolveAdminTerritoryScope(user);
  const showLocalFieldFilter = canAdminFilterByLocalField(territoryScope);

  const [localFields, years, activeYearId] = await Promise.all([
    showLocalFieldFilter
      ? listLocalFieldsForTerritory(user).catch((): LocalField[] => [])
      : Promise.resolve<LocalField[]>([]),
    listEcclesiasticalYears().catch(() => []),
    getActiveEcclesiasticalYearId().catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <FinancesViewSwitcher active="overview" />
      <FinancesOverview
        localFields={localFields}
        showLocalFieldFilter={showLocalFieldFilter}
        years={years}
        activeYearId={activeYearId}
      />
    </div>
  );
}
