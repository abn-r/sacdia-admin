"use client";

import { useTranslations } from "next-intl";
import { AnnualBudgetConfigList } from "@/components/annual-rankings/annual-budget-config-list";
import { RankingTiersPanel } from "@/components/annual-rankings/ranking-tiers-panel";
import { UrlTabs, useUrlTab } from "@/components/shared/url-tabs";
import type { AnnualRankingConfig, RankingTier } from "@/lib/api/annual-rankings";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";

interface AnnualRankingConfigClientPageProps {
  initialConfigs: AnnualRankingConfig[];
  initialTiers: RankingTier[];
  unions: Union[];
  localFields: LocalField[];
  clubTypes: ClubType[];
  ecclesiasticalYears: EcclesiasticalYear[];
  createBlocked?: boolean;
}

export function AnnualRankingConfigClientPage({
  initialConfigs,
  initialTiers,
  unions,
  localFields,
  clubTypes,
  ecclesiasticalYears,
  createBlocked = false,
}: AnnualRankingConfigClientPageProps) {
  const t = useTranslations("evaluation.progress.annual.config");
  const tab = useUrlTab("tab", "budgets");

  return (
    <div className="space-y-6">
      <UrlTabs
        ariaLabel={t("tabsLabel")}
        defaultValue="budgets"
        tabs={[
          { value: "budgets", label: t("tabs.budgets"), count: initialConfigs.length },
          { value: "recognitions", label: t("tabs.recognitions") },
        ]}
      />

      {tab === "recognitions" ? (
        <RankingTiersPanel initialTiers={initialTiers} />
      ) : (
        <AnnualBudgetConfigList
          configs={initialConfigs}
          unions={unions}
          localFields={localFields}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
          createBlocked={createBlocked}
        />
      )}
    </div>
  );
}
