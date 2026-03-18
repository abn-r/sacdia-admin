import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { RolesCards } from "@/components/rbac/roles-cards";
import { requireAdminUser } from "@/lib/auth/session";
import { listRoles, listPermissions } from "@/lib/rbac/service";
import { syncRolePermissionsAction } from "@/lib/rbac/actions";
import type { Role, Permission } from "@/lib/rbac/types";
import { ApiError } from "@/lib/api/client";

export default async function RolesPage() {
  await requireAdminUser();

  let roles: Role[] = [];
  let permissions: Permission[] = [];
  let loadError: string | null = null;

  try {
    [roles, permissions] = await Promise.all([
      listRoles(),
      listPermissions().catch(() => []),
    ]);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Error inesperado";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Gestión de roles y asignación de permisos."
      />

      {loadError && (
        <>
          <EndpointErrorBanner state="missing" detail={loadError} />
          <EmptyState icon={Users} title="No se pudo cargar roles" description={loadError} />
        </>
      )}

      {!loadError && roles.length === 0 && (
        <EmptyState icon={Users} title="Sin roles" description="No se encontraron roles registrados." />
      )}

      {!loadError && roles.length > 0 && (
        <RolesCards
          roles={roles}
          allPermissions={permissions}
          syncAction={syncRolePermissionsAction}
        />
      )}
    </div>
  );
}
