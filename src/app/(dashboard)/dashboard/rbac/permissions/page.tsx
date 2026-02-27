import { Key } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PermissionsTable } from "@/components/rbac/permissions-table";
import { requireAdminUser } from "@/lib/auth/session";
import { listPermissions } from "@/lib/rbac/service";
import {
  createPermissionAction,
  updatePermissionAction,
  deletePermissionAction,
} from "@/lib/rbac/actions";
import type { Permission } from "@/lib/rbac/types";
import { ApiError } from "@/lib/api/client";

export default async function PermissionsPage() {
  await requireAdminUser();

  let items: Permission[] = [];
  let loadError: string | null = null;

  try {
    items = await listPermissions();
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Error inesperado";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de permisos"
        description="Permisos disponibles en el sistema."
      />

      {loadError && (
        <>
          <EndpointErrorBanner state="missing" detail={loadError} />
          <EmptyState icon={Key} title="No se pudo cargar el catálogo" description={loadError} />
        </>
      )}

      {!loadError && (
        <PermissionsTable
          items={items}
          createAction={createPermissionAction}
          updateAction={updatePermissionAction}
          deleteAction={deletePermissionAction}
        />
      )}
    </div>
  );
}
