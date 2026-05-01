import { CalendarOff } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { YearEndClientPage } from "@/components/year-end/year-end-client-page";
import { listEcclesiasticalYears, type EcclesiasticalYear } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function YearEndPage() {
  await requireAdminUser();

  let years: EcclesiasticalYear[] = [];
  let loadError: string | null = null;

  try {
    const payload = await listEcclesiasticalYears();
    years = Array.isArray(payload) ? payload : [];
  } catch (err) {
    loadError =
      err instanceof ApiError
        ? err.message
        : "No se pudieron cargar los años eclesiásticos.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cierre de año"
        description="Cierra el año eclesiástico activo para archivar inscripciones, carpetas y reportes."
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && years.length === 0 && (
        <EmptyState
          icon={CalendarOff}
          title="Sin años eclesiásticos"
          description="No hay años eclesiásticos registrados en el sistema."
        />
      )}

      {!loadError && years.length > 0 && (
        <YearEndClientPage ecclesiasticalYears={years} />
      )}
    </div>
  );
}
