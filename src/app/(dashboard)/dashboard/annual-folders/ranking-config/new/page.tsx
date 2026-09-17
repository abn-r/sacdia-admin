import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualFolderSetupNotice } from "@/components/annual-folders/annual-folder-setup-notice";
import { AnnualBudgetConfigForm } from "@/components/annual-rankings/annual-budget-config-form";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

const ROUTE_BASE = "/dashboard/annual-folders/ranking-config";

export default async function NewAnnualRankingConfigPage() {
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const tNav = await getTranslations("nav.items");
  const data = await loadRankingConfigPageData();

  const breadcrumbs = [
    { label: tNav("dashboard"), href: "/dashboard" },
    { label: tNav("annual_folders"), href: "/dashboard/annual-folders" },
    { label: t("breadcrumbRankingConfig"), href: ROUTE_BASE },
    { label: t("breadcrumbNew") },
  ];

  if (data.loadError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("newTitle")} breadcrumbs={breadcrumbs} />
        <EndpointErrorBanner state="missing" detail={data.loadError} />
      </div>
    );
  }

  if (data.createGap) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("newTitle")} breadcrumbs={breadcrumbs} />
        <AnnualFolderSetupNotice gap={data.createGap} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("newTitle")}
        description={t("newDescription")}
        breadcrumbs={breadcrumbs}
      />

      <AnnualBudgetConfigForm
        mode="create"
        unions={data.unions}
        localFields={data.localFields}
        clubTypes={data.clubTypes}
        ecclesiasticalYears={data.ecclesiasticalYears}
      />
    </div>
  );
}
