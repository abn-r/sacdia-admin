import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualRankingConfigClientPage } from "@/components/annual-rankings/annual-ranking-config-client-page";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

export default async function AnnualRankingConfigPage() {
  const data = await loadRankingConfigPageData();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración anual de rankings"
        description="Administrá presupuestos anuales por secciones y rangos globales de reconocimiento para la Carpeta Anual de Evidencias."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Carpeta Anual de Evidencias", href: "/dashboard/annual-folders" },
          { label: "Configuración de rankings" },
        ]}
      />

      {data.loadError && (
        <EndpointErrorBanner state="missing" detail={data.loadError} />
      )}

      {!data.loadError && data.missingCatalogs && (
        <EmptyState
          icon={Settings2}
          title="Faltan catálogos para configurar rankings"
          description="Necesitás al menos un campo local o unión, un tipo de club y un año eclesiástico activo."
        />
      )}

      {!data.loadError && !data.missingCatalogs && (
        <AnnualRankingConfigClientPage
          initialConfigs={data.configs}
          initialTiers={data.tiers}
          unions={data.unions}
          localFields={data.localFields}
          clubTypes={data.clubTypes}
          ecclesiasticalYears={data.ecclesiasticalYears}
        />
      )}
    </div>
  );
}
