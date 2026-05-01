import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { RolesTable } from "@/components/rbac/roles-table";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { listRoles } from "@/lib/rbac/service";
import { ApiError } from "@/lib/api/client";
import type { Role } from "@/lib/rbac/types";

export default async function RolesPage() {
  const user = await requireAdminUser();
  const isSuperAdmin = extractRoles(user).includes(SUPER_ADMIN_ROLE);

  let roles: Role[] = [];
  let loadError: string | null = null;

  try {
    // Fetch all roles — client-side tab filtering drives the active/inactive split
    roles = await listRoles("all");
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Error inesperado al cargar los roles";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Gestión de roles del sistema y asignación de permisos."
        actions={
          isSuperAdmin ? (
            <Button asChild>
              <Link href="/dashboard/rbac/roles/new">
                <Plus className="size-4" />
                Nuevo rol
              </Link>
            </Button>
          ) : undefined
        }
      />

      {loadError && (
        <>
          <EndpointErrorBanner state="missing" detail={loadError} />
          <EmptyState
            icon={ShieldCheck}
            title="No se pudo cargar roles"
            description={loadError}
          />
        </>
      )}

      {!loadError && roles.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="Sin roles"
          description="No se encontraron roles registrados en el sistema."
        >
          {isSuperAdmin && (
            <Button asChild>
              <Link href="/dashboard/rbac/roles/new">
                <Plus className="size-4" />
                Nuevo rol
              </Link>
            </Button>
          )}
        </EmptyState>
      )}

      {!loadError && roles.length > 0 && (
        <RolesTable roles={roles} isSuperAdmin={isSuperAdmin} />
      )}
    </div>
  );
}
