"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SlaDashboard } from "@/lib/api/analytics";
import { PageHeader } from "@/components/shared/page-header";
import { SlaStatCards } from "./sla-stat-cards";
import { SlaPipelineChart } from "./sla-pipeline-chart";
import { SlaValidationCard } from "./sla-validation-card";
import { SlaThroughputChart } from "./sla-throughput-chart";
import { SlaCamporeeCard } from "./sla-camporee-card";

interface SlaDashboardClientProps {
  data: SlaDashboard;
}

export function SlaDashboardClient({ data }: SlaDashboardClientProps) {
  const t = useTranslations("sla.client");

  const computedAgo = formatDistanceToNow(new Date(data.computed_at), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3 shrink-0" aria-hidden="true" />
            <span>
              {t("updated", { ago: computedAgo })}
              {data.cached ? t("cached") : ""}
            </span>
          </div>
        }
      />

      {/* KPI Cards */}
      <SlaStatCards data={data} />

      {/* Charts row: Pipeline + Throughput */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SlaPipelineChart pipeline={data.investiture.pipeline} />
        <SlaThroughputChart throughput={data.throughput} />
      </div>

      {/* Cards row: Validation + Camporee */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SlaValidationCard validation={data.validation} />
        <SlaCamporeeCard camporee={data.camporee} />
      </div>
    </div>
  );
}
