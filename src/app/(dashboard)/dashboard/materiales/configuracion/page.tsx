import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ConfiguracionForm } from "./_components/configuracion-form";
import { getConfiguracion } from "@/lib/api/materiales";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import { ApiError } from "@/lib/api/client";
import type { MaterialConfig } from "@/lib/types/materiales";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConfiguracionPage() {
  const user = await requireAdminUser();

  if (!hasPermission(user, "materiales:configure")) {
    redirect("/dashboard");
  }

  let config: MaterialConfig | null = null;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    config = await getConfiguracion();
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = "Error al cargar la configuración.";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de materiales"
        description="Datos bancarios y opciones de entrega para las solicitudes de materiales."
      />

      {/* Error state */}
      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {/* Form */}
      {config && <ConfiguracionForm config={config} />}
    </div>
  );
}
