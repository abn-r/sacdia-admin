import { FileSearch } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { EvidenceReviewClientPage } from "@/components/evidence-review/evidence-review-client-page";
import { getEvidencePending, type EvidenceItem } from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EvidenceReviewPage() {
  await requireAdminUser();

  let items: EvidenceItem[] = [];
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    const result = await getEvidencePending(undefined, 1, 200);
    items = result.data;
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = "No se pudieron cargar las evidencias pendientes.";
    }
  }

  const pendingCount = items.filter((item) =>
    item.type === "honor" ? item.status === "in_progress" : item.status === "pendiente",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revisión de Evidencias"
        description="Valida las evidencias subidas por los miembros para carpetas, clases y honores."
      />

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && items.length === 0 && (
        <EmptyState
          icon={FileSearch}
          title="Sin evidencias pendientes"
          description="No hay evidencias pendientes de revisión en este momento."
        />
      )}

      {!loadError && items.length > 0 && (
        <EvidenceReviewClientPage initialItems={items} />
      )}

      {!loadError && pendingCount === 0 && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Todas las evidencias han sido revisadas.
        </p>
      )}
    </div>
  );
}
