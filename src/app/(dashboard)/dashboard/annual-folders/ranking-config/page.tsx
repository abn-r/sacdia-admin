import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualRankingConfigClientPage } from "@/components/annual-rankings/annual-ranking-config-client-page";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

export default async function AnnualRankingConfigPage() {
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const tNav = await getTranslations("nav.items");
  const data = await loadRankingConfigPageData();

  const breadcrumbs = [
    { label: tNav("dashboard"), href: "/dashboard" },
    { label: tNav("annual_folders"), href: "/dashboard/annual-folders" },
    { label: t("breadcrumbRankingConfig") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={breadcrumbs}
      />

      {data.loadError && (
        <EndpointErrorBanner state="missing" detail={data.loadError} />
      )}

      {!data.loadError && data.missingCatalogs && (
        <EmptyState
          icon={Settings2}
          title={t("missingCatalogsTitle")}
          description={t("missingCatalogsDescription")}
        />
      )}

      {!data.loadError && !data.missingCatalogs && (
        <AnnualRankingConfigClientPage
          initialConfigs={data.configs}
          initialTiers={data.tiers}
          unions={data.unions}
          localFields={data.localFields}
          clubTypes={data.clubTypes}
          ecclesiasticalYears={data.ecclesiasticalYears}
        />
      )}
    </div>
  );
}
