import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ConfigClientPage } from "@/components/investiture/config-client-page";
import { getInvestitureConfigs, type InvestitureConfig } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function InvestitureConfigPage() {
  await requireAdminUser();

  let configs: InvestitureConfig[] = [];
  let loadError: string | null = null;

  try {
    const data = await getInvestitureConfigs();
    configs = Array.isArray(data) ? data : [];
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar las configuraciones de investidura.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de Investiduras"
        description="Gestioná las fechas límite de envío y de ceremonia de investidura por campo local y año eclesiástico."
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && (
        <ConfigClientPage initialConfigs={configs} />
      )}
    </div>
  );
}
