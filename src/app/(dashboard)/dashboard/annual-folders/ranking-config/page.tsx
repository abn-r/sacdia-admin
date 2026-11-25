import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AnnualFolderSetupNotice } from "@/components/annual-folders/annual-folder-setup-notice";
import { AnnualRankingConfigClientPage } from "@/components/annual-rankings/annual-ranking-config-client-page";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("evaluation.progress.annual.config");
  return { title: t("title") };
}

export default async function AnnualRankingConfigPage() {
  const t = await getTranslations("evaluation.progress.annual");
  const tCrumbs = await getTranslations("nav.breadcrumbs");
  const data = await loadRankingConfigPageData();

  const breadcrumbs = [
    { label: tCrumbs("home"), href: "/dashboard" },
    { label: t("title"), href: "/dashboard/annual-folders/rankings" },
    { label: t("config.breadcrumb") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("config.title")}
        description={t("config.description")}
        breadcrumbs={breadcrumbs}
        actions={
          data.createGap != null || data.loadError ? (
            <Button disabled>
              <Plus aria-hidden />
              {t("config.newBudget")}
            </Button>
          ) : (
            <Button asChild>
              <Link href="/dashboard/annual-folders/ranking-config/new">
                <Plus aria-hidden />
                {t("config.newBudget")}
              </Link>
            </Button>
          )
        }
      />

      {data.loadError ? (
        <ErrorState retry />
      ) : (
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
