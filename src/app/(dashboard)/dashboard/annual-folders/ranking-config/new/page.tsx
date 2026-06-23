import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualBudgetConfigForm } from "@/components/annual-rankings/annual-budget-config-form";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

const ROUTE_BASE = "/dashboard/annual-folders/ranking-config";

export default async function NewAnnualRankingConfigPage() {
  const data = await loadRankingConfigPageData();

  if (data.loadError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Nueva configuración de presupuesto"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Carpeta Anual de Evidencias", href: "/dashboard/annual-folders" },
            { label: "Configuración de rankings", href: ROUTE_BASE },
            { label: "Nueva" },
          ]}
        />
        <EndpointErrorBanner state="missing" detail={data.loadError} />
      </div>
    );
  }

  if (data.missingCatalogs) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Nueva configuración de presupuesto"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Carpeta Anual de Evidencias", href: "/dashboard/annual-folders" },
            { label: "Configuración de rankings", href: ROUTE_BASE },
            { label: "Nueva" },
          ]}
        />
        <EmptyState
          icon={Settings2}
          title="Faltan catálogos para configurar rankings"
          description="Necesitás al menos un campo local o unión, un tipo de club y un año eclesiástico activo."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva configuración de presupuesto"
        description="Definí el puntaje máximo anual y su distribución por secciones y subsecciones."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Carpeta Anual de Evidencias", href: "/dashboard/annual-folders" },
          { label: "Configuración de rankings", href: ROUTE_BASE },
          { label: "Nueva" },
        ]}
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
