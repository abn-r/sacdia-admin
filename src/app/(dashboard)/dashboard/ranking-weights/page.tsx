import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { RankingWeightsClientPage } from "@/components/ranking-weights/ranking-weights-client-page";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { fetchRankingWeights } from "@/lib/api/ranking-weights";
import type { RankingWeights } from "@/lib/api/ranking-weights";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function RankingWeightsPage() {
  await requireAdminUser();

  let weights: RankingWeights[] = [];
  let loadError: string | null = null;

  try {
    const result = await fetchRankingWeights();
    weights = Array.isArray(result) ? result : [];
  } catch (err) {
    if (err instanceof ApiError) {
      loadError = err.message;
    } else {
      loadError =
        "No se pudieron cargar los pesos de ranking. Verificá la conexión con el servidor.";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesos de ranking"
        description="Configurá la ponderación de cada dimensión (folder, finance, camporee, evidence) para el cálculo del ranking anual. La suma de los 4 pesos debe ser exactamente 100."
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && weights.length === 0 && (
        <EmptyState
          icon={Settings2}
          title="Sin configuración"
          description="No se encontraron configuraciones de pesos. El backend debería haber creado un default global al iniciarse."
        />
      )}

      {!loadError && weights.length > 0 && (
        <RankingWeightsClientPage initial={weights} />
      )}
    </div>
  );
}
