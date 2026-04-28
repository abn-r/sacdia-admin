import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CreateRoleForm } from "@/components/rbac/role-form";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { listPermissions } from "@/lib/rbac/service";
import { ApiError } from "@/lib/api/client";
import type { Permission } from "@/lib/rbac/types";

export default async function NewRolePage() {
  const user = await requireAdminUser();
  const isSuperAdmin = extractRoles(user).includes(SUPER_ADMIN_ROLE);

  // Only super_admin can create roles — redirect otherwise
  if (!isSuperAdmin) {
    redirect("/dashboard/rbac/roles");
  }

  let allPermissions: Permission[] = [];
  let loadError: string | null = null;

  try {
    allPermissions = await listPermissions();
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Error al cargar los permisos disponibles";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/rbac/roles" aria-label="Volver a roles">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title="Nuevo rol"
          description="Define el nombre, categoría y permisos iniciales del rol."
          className="flex-1"
        />
      </div>

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      <CreateRoleForm allPermissions={allPermissions} />
    </div>
  );
}
