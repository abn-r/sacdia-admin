import { Suspense } from "react";
import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualRankingConfigClientPage } from "@/components/annual-rankings/annual-ranking-config-client-page";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { loadRankingConfigPageData } from "@/lib/v2/loaders/annual-folders";

function RankingConfigSkeleton() {
  return <Skeleton className="h-72 w-full rounded-xl" />;
}

async function RankingConfigContent() {
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const data = await loadRankingConfigPageData();

  if (data.loadError) {
    return <EndpointErrorBanner state="missing" detail={data.loadError} />;
  }

  if (data.missingCatalogs) {
    return (
      <EmptyState
        icon={Settings2}
        title={t("missingCatalogsTitle")}
        description={t("missingCatalogsDescription")}
      />
    );
  }

  return (
    <AnnualRankingConfigClientPage
      initialConfigs={data.configs}
      initialTiers={data.tiers}
      unions={data.unions}
      localFields={data.localFields}
      clubTypes={data.clubTypes}
      ecclesiasticalYears={data.ecclesiasticalYears}
    />
  );
}

export default async function V2AnnualRankingConfigPage() {
  const t = await getTranslations("annual_folders.pageRankingConfig");

  return (
    <V2PageShell title={t("title")} description={t("description")} bleed>
      <Suspense fallback={<RankingConfigSkeleton />}>
        <RankingConfigContent />
      </Suspense>
    </V2PageShell>
  );
}
