import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { AssignmentsClientPage } from "@/components/requests/assignments-client-page";
import { getAssignmentRequests, type AssignmentRequest } from "@/lib/api/requests";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function AssignmentRequestsPage() {
  await requireAdminUser();

  let requests: AssignmentRequest[] = [];
  let loadError: string | null = null;

  try {
    requests = await getAssignmentRequests();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar las solicitudes de asignación de rol.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de Asignación"
        description="Revisión y aprobación de solicitudes de asignación de roles en secciones."
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && requests.length === 0 && (
        <EmptyState
          icon={UserCog}
          title="Sin solicitudes"
          description="No hay solicitudes de asignación de rol registradas en este momento."
        />
      )}

      {!loadError && requests.length > 0 && (
        <AssignmentsClientPage initialRequests={requests} />
      )}
    </div>
  );
}
