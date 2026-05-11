import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buildRoleTranslator } from "@/lib/auth/role-labels";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { EditRoleForm } from "@/components/rbac/role-form";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { getRoleWithPermissions, listPermissions } from "@/lib/rbac/service";
import { ApiError } from "@/lib/api/client";
import type { Permission, Role } from "@/lib/rbac/types";

interface EditRolePageProps {
  params: Promise<{ roleId: string }>;
}

export default async function EditRolePage({ params }: EditRolePageProps) {
  const t = await getTranslations("rbac.pages.rolesDetail");
  const tRoles = await getTranslations("roles");
  const translateRole = buildRoleTranslator(tRoles);
  const { roleId } = await params;

  const user = await requireAdminUser();
  const isSuperAdmin = extractRoles(user).includes(SUPER_ADMIN_ROLE);

  // Only super-admin can edit roles
  if (!isSuperAdmin) {
    redirect("/dashboard/rbac/roles");
  }

  let role: Role | null = null;
  let allPermissions: Permission[] = [];
  let loadError: string | null = null;

  try {
    [role, allPermissions] = await Promise.all([
      getRoleWithPermissions(roleId),
      listPermissions(),
    ]);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadError");
  }

  // 404 if role not found
  if (!loadError && !role) {
    notFound();
  }

  // Protect super-admin role from edit via UI
  if (role?.role_name === "super-admin") {
    redirect("/dashboard/rbac/roles");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/rbac/roles" aria-label={t("backAriaLabel")}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title={role ? t("editTitle", { name: translateRole(role.role_name) }) : t("editTitleFallback")}
          description={t("description")}
          className="flex-1"
        />
      </div>

      {loadError && (
        <>
          <EndpointErrorBanner state="missing" detail={loadError} />
          <EmptyState
            icon={ShieldCheck}
            title={t("emptyLoadTitle")}
            description={loadError}
          />
        </>
      )}

      {!loadError && role && (
        <EditRoleForm role={role} allPermissions={allPermissions} />
      )}
    </div>
  );
}
