import { Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { PipelineClientPage } from "@/components/investiture/pipeline-client-page";
import { getPipelineEnrollments, type PipelineEnrollment } from "@/lib/api/investiture";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles } from "@/lib/auth/roles";
import type { UserRole } from "@/components/investiture/pipeline-table";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUserRole(roles: string[]): UserRole {
  const set = new Set(roles);
  if (set.has("super_admin") || set.has("admin")) return "admin";
  if (set.has("coordinator")) return "coordinator";
  if (set.has("field")) return "field";
  return "director";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestiturePipelinePage() {
  const user = await requireAdminUser();

  const roles = extractRoles(user);
  const userRole = resolveUserRole(roles);

  let enrollments: PipelineEnrollment[] = [];
  let loadError: string | null = null;

  try {
    enrollments = await getPipelineEnrollments();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar las investiduras.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline de Investiduras"
        description="Seguimiento del proceso de aprobación en cadena: director, coordinación y campo."
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && enrollments.length === 0 && (
        <EmptyState
          icon={Star}
          title="Sin solicitudes de investidura"
          description="No hay solicitudes de investidura en el sistema en este momento."
        />
      )}

      {!loadError && enrollments.length > 0 && (
        <PipelineClientPage
          initialEnrollments={enrollments}
          userRole={userRole}
        />
      )}
    </div>
  );
}
