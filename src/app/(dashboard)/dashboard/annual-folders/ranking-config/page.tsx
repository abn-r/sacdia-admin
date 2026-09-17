import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualFolderSetupNotice } from "@/components/annual-folders/annual-folder-setup-notice";
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

      {!data.loadError && (
        <>
          <AnnualFolderSetupNotice gap={data.createGap} />
          <AnnualRankingConfigClientPage
            initialConfigs={data.configs}
            initialTiers={data.tiers}
            unions={data.unions}
            localFields={data.localFields}
            clubTypes={data.clubTypes}
            ecclesiasticalYears={data.ecclesiasticalYears}
            createBlocked={data.createGap != null}
          />
        </>
      )}
    </div>
  );
}
