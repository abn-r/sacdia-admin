"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import type { SlaDashboard } from "@/lib/api/analytics";
import { SlaStatCards } from "./sla-stat-cards";
import { SlaPipelineChart } from "./sla-pipeline-chart";
import { SlaValidationCard } from "./sla-validation-card";
import { SlaThroughputChart } from "./sla-throughput-chart";
import { SlaCamporeeCard } from "./sla-camporee-card";

interface SlaDashboardClientProps {
  data: SlaDashboard;
}

export function SlaDashboardClient({ data }: SlaDashboardClientProps) {
  const computedAgo = formatDistanceToNow(new Date(data.computed_at), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SLA Dashboard</h1>
          <p className="text-muted-foreground">
            Metricas operativas de investiduras, validaciones y camporees.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <RefreshCw className="size-3" />
          <span>Actualizado {computedAgo}{data.cached ? " (cache)" : ""}</span>
        </div>
      </div>

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
