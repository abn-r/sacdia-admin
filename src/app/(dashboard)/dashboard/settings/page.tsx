import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { SystemConfigClientPage } from "@/components/system-config/system-config-client-page";
import { getSystemConfigs, type SystemConfig } from "@/lib/api/system-config";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function SystemSettingsPage() {
  await requireAdminUser();

  let configs: SystemConfig[] = [];
  let loadError: string | null = null;

  try {
    configs = await getSystemConfigs();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "No se pudo cargar la configuración del sistema.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración del Sistema"
        description="Parámetros globales del sistema agrupados por módulo."
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && configs.length === 0 && (
        <EmptyState
          icon={Settings2}
          title="Sin configuraciones"
          description="No hay entradas de configuración del sistema registradas."
        />
      )}

      {!loadError && configs.length > 0 && (
        <SystemConfigClientPage initialConfigs={configs} />
      )}
    </div>
  );
}
