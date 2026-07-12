import { Suspense } from "react";
import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualBudgetConfigForm } from "@/components/annual-rankings/annual-budget-config-form";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { loadRankingConfigPageData } from "@/lib/v2/loaders/annual-folders";

function RankingConfigFormSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />;
}

async function NewRankingConfigContent() {
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
    <AnnualBudgetConfigForm
      mode="create"
      unions={data.unions}
      localFields={data.localFields}
      clubTypes={data.clubTypes}
      ecclesiasticalYears={data.ecclesiasticalYears}
    />
  );
}

export default async function V2NewAnnualRankingConfigPage() {
  const t = await getTranslations("annual_folders.pageRankingConfig");

  return (
    <V2PageShell title={t("newTitle")} description={t("newDescription")} bleed>
      <Suspense fallback={<RankingConfigFormSkeleton />}>
        <NewRankingConfigContent />
      </Suspense>
    </V2PageShell>
  );
}
