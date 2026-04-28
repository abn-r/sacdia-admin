import { ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { ValidationClientPage } from "@/components/validation/validation-client-page";
import { getPendingValidations, type PendingValidation } from "@/lib/api/validation";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractSections(
  validations: PendingValidation[],
): Array<{ section_id: number; name: string }> {
  const map = new Map<number, string>();
  for (const v of validations) {
    if (v.section) {
      map.set(v.section.section_id, v.section.name);
    }
  }
  return Array.from(map.entries()).map(([section_id, name]) => ({
    section_id,
    name,
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ValidationPage() {
  await requireAdminUser();

  let classValidations: PendingValidation[] = [];
  let honorValidations: PendingValidation[] = [];
  let loadError: string | null = null;

  try {
    const [classResult, honorResult] = await Promise.allSettled([
      getPendingValidations({ entity_type: "class" }),
      getPendingValidations({ entity_type: "honor" }),
    ]);

    if (classResult.status === "fulfilled") {
      classValidations = classResult.value;
    } else {
      const err = classResult.reason;
      loadError =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las validaciones de clases.";
    }

    if (honorResult.status === "fulfilled") {
      honorValidations = honorResult.value;
    } else if (!loadError) {
      const err = honorResult.reason;
      loadError =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las validaciones de especialidades.";
    }
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar las validaciones pendientes.";
  }

  const sections = extractSections([...classValidations, ...honorValidations]);
  const totalPending = classValidations.length + honorValidations.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validación"
        description="Revisión y aprobación de clases y especialidades enviadas para validación."
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && totalPending === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title="Sin validaciones pendientes"
          description="No hay clases ni especialidades pendientes de validación en este momento."
        />
      )}

      {!loadError && totalPending > 0 && (
        <ValidationClientPage
          initialClasses={classValidations}
          initialHonors={honorValidations}
          sections={sections}
        />
      )}
    </div>
  );
}
