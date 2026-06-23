import { Settings2 } from "lucide-react";
import { notFound } from "next/navigation";
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
  const data = await loadRankingConfigPageData();
  const config = data.configs.find(
    (item) => item.annual_ranking_config_id === id,
  );

  if (!data.loadError && !data.missingCatalogs && !config) {
    notFound();
  }

  if (data.loadError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Editar configuración de presupuesto"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Carpeta Anual de Evidencias", href: "/dashboard/annual-folders" },
            { label: "Configuración de rankings", href: ROUTE_BASE },
            { label: "Editar" },
          ]}
        />
        <EndpointErrorBanner state="missing" detail={data.loadError} />
      </div>
    );
  }

  if (data.missingCatalogs || !config) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Editar configuración de presupuesto"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Carpeta Anual de Evidencias", href: "/dashboard/annual-folders" },
            { label: "Configuración de rankings", href: ROUTE_BASE },
            { label: "Editar" },
          ]}
        />
        <EmptyState
          icon={Settings2}
          title="Configuración no disponible"
          description="No se encontró la configuración solicitada o faltan catálogos para editarla."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editar configuración de presupuesto"
        description="Actualizá el puntaje máximo y la distribución por secciones y subsecciones."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Carpeta Anual de Evidencias", href: "/dashboard/annual-folders" },
          { label: "Configuración de rankings", href: ROUTE_BASE },
          { label: "Editar" },
        ]}
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
