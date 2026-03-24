import { ArrowRightLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { TransfersClientPage } from "@/components/requests/transfers-client-page";
import { getTransferRequests, type TransferRequest } from "@/lib/api/requests";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function TransferRequestsPage() {
  await requireAdminUser();

  let requests: TransferRequest[] = [];
  let loadError: string | null = null;

  try {
    requests = await getTransferRequests();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar las solicitudes de transferencia.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de Transferencia"
        description="Revisión y aprobación de solicitudes de transferencia entre secciones."
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && requests.length === 0 && (
        <EmptyState
          icon={ArrowRightLeft}
          title="Sin solicitudes"
          description="No hay solicitudes de transferencia registradas en este momento."
        />
      )}

      {!loadError && requests.length > 0 && (
        <TransfersClientPage initialRequests={requests} />
      )}
    </div>
  );
}
