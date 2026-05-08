import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { HonorForm } from "@/components/honors/honor-form";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { HONORS_CREATE } from "@/lib/auth/permissions";
import { createHonorAction } from "@/lib/honors/actions";
import { loadHonorCatalogOptions } from "@/lib/honors/catalogs";

export default async function NewHonorPage() {
  const user = await requireAdminUser();
  const roleSet = new Set(extractRoles(user));
  const isSuperAdmin = roleSet.has(SUPER_ADMIN_ROLE);
  const canCreate = isSuperAdmin || hasAnyPermission(user, [HONORS_CREATE]);

  if (!canCreate) {
    notFound();
  }

  const { categoryOptions, clubTypeOptions } = await loadHonorCatalogOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crear especialidad"
        description="Registra una nueva especialidad en el catálogo."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/honors">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <HonorForm
        mode="create"
        categoryOptions={categoryOptions}
        clubTypeOptions={clubTypeOptions}
        formAction={createHonorAction}
      />
    </div>
  );
}
