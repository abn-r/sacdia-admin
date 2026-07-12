"use client";

import { Medal, PieChart } from "lucide-react";
import { AnnualBudgetConfigList } from "@/components/annual-rankings/annual-budget-config-list";
import { RankingTiersPanel } from "@/components/annual-rankings/ranking-tiers-panel";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
}

export function AnnualRankingConfigClientPage({
  initialConfigs,
  initialTiers,
  unions,
  localFields,
  clubTypes,
  ecclesiasticalYears,
}: AnnualRankingConfigClientPageProps) {
  return (
    <Tabs defaultValue="budget" className="gap-6">
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-1 border-b pb-0"
      >
        <TabsTrigger value="budget" className="gap-2 px-4 py-2.5">
          <PieChart className="size-4" />
          Presupuesto anual
        </TabsTrigger>
        <TabsTrigger value="tiers" className="gap-2 px-4 py-2.5">
          <Medal className="size-4" />
          Rangos de reconocimiento
        </TabsTrigger>
      </TabsList>

      <TabsContent value="budget" className="mt-0">
        <AnnualBudgetConfigList
          configs={initialConfigs}
          unions={unions}
          localFields={localFields}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
        />
      </TabsContent>

      <TabsContent value="tiers" className="mt-0">
        <RankingTiersPanel initialTiers={initialTiers} />
      </TabsContent>
    </Tabs>
  );
}
