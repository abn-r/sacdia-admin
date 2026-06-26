import { Settings2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualBudgetConfigForm } from "@/components/annual-rankings/annual-budget-config-form";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

const ROUTE_BASE = "/dashboard/annual-folders/ranking-config";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAnnualRankingConfigPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const tNav = await getTranslations("nav.items");
  const data = await loadRankingConfigPageData();
  const config = data.configs.find(
    (item) => item.annual_ranking_config_id === id,
  );

  const breadcrumbs = [
    { label: tNav("dashboard"), href: "/dashboard" },
    { label: tNav("annual_folders"), href: "/dashboard/annual-folders" },
    { label: t("breadcrumbRankingConfig"), href: ROUTE_BASE },
    { label: t("breadcrumbEdit") },
  ];

  if (!data.loadError && !data.missingCatalogs && !config) {
    notFound();
  }

  if (data.loadError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("editTitle")} breadcrumbs={breadcrumbs} />
        <EndpointErrorBanner state="missing" detail={data.loadError} />
      </div>
    );
  }

  if (data.missingCatalogs || !config) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("editTitle")} breadcrumbs={breadcrumbs} />
        <EmptyState
          icon={Settings2}
          title={t("unavailableTitle")}
          description={t("unavailableDescription")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("editTitle")}
        description={t("editDescription")}
        breadcrumbs={breadcrumbs}
      />

      <AnnualBudgetConfigForm
        mode="edit"
        config={config}
        unions={data.unions}
        localFields={data.localFields}
        clubTypes={data.clubTypes}
        ecclesiasticalYears={data.ecclesiasticalYears}
      />
    </div>
  );
}
