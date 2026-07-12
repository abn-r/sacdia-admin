import { Suspense } from "react";
import { Settings2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualBudgetConfigForm } from "@/components/annual-rankings/annual-budget-config-form";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { loadRankingConfigPageData } from "@/lib/v2/loaders/annual-folders";

type PageProps = {
  params: Promise<{ id: string }>;
};

function RankingConfigFormSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />;
}

async function EditRankingConfigContent({ id }: { id: string }) {
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const data = await loadRankingConfigPageData();
  const config = data.configs.find((item) => item.annual_ranking_config_id === id);

  if (!data.loadError && !data.missingCatalogs && !config) {
    notFound();
  }

  if (data.loadError) {
    return <EndpointErrorBanner state="missing" detail={data.loadError} />;
  }

  if (data.missingCatalogs || !config) {
    return (
      <EmptyState
        icon={Settings2}
        title={t("unavailableTitle")}
        description={t("unavailableDescription")}
      />
    );
  }

  return (
    <AnnualBudgetConfigForm
      mode="edit"
      config={config}
      unions={data.unions}
      localFields={data.localFields}
      clubTypes={data.clubTypes}
      ecclesiasticalYears={data.ecclesiasticalYears}
    />
  );
}

export default async function V2EditAnnualRankingConfigPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("annual_folders.pageRankingConfig");

  return (
    <V2PageShell title={t("editTitle")} description={t("editDescription")} bleed>
      <Suspense fallback={<RankingConfigFormSkeleton />}>
        <EditRankingConfigContent id={id} />
      </Suspense>
    </V2PageShell>
  );
}
