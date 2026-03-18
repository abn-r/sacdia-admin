import { Grid3X3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import { requireAdminUser } from "@/lib/auth/session";
import { listRoles, listPermissions } from "@/lib/rbac/service";
import { syncRolePermissionsAction } from "@/lib/rbac/actions";
import type { Role, Permission } from "@/lib/rbac/types";
import { ApiError } from "@/lib/api/client";

export default async function MatrixPage() {
  await requireAdminUser();

  let roles: Role[] = [];
  let permissions: Permission[] = [];
  let loadError: string | null = null;

  try {
    [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Error inesperado";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matriz de permisos"
        description="Asigna permisos a roles directamente desde la tabla. Cada columna es un rol, cada fila un permiso."
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && (roles.length === 0 || permissions.length === 0) && (
        <EmptyState
          icon={Grid3X3}
          title="Sin datos"
          description="No hay roles o permisos registrados para mostrar la matriz."
        />
      )}

      {!loadError && roles.length > 0 && permissions.length > 0 && (
        <PermissionMatrix
          roles={roles}
          permissions={permissions}
          syncAction={syncRolePermissionsAction}
        />
      )}
    </div>
  );
}
