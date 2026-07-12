import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
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

  if (data.missingCatalogs) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("newTitle")} breadcrumbs={breadcrumbs} />
        <EmptyState
          icon={Settings2}
          title={t("missingCatalogsTitle")}
          description={t("missingCatalogsDescription")}
        />
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
