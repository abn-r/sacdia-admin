import { getTranslations } from "next-intl/server";
import { buildRoleTranslator } from "@/lib/auth/role-labels";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { EditRoleForm } from "@/components/rbac/role-form";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";
import { getRoleWithPermissions, listPermissions } from "@/lib/rbac/service";
import type { Permission, Role } from "@/lib/rbac/types";

interface EditRolePageProps {
  params: Promise<{ roleId: string }>;
}

export default async function ConfigurationEditRolePage({ params }: EditRolePageProps) {
  const t = await getTranslations("rbac.pages.rolesDetail");
  const tNav = await getTranslations("nav.items");
  const tRoles = await getTranslations("roles");
  const translateRole = buildRoleTranslator(tRoles);
  const { roleId } = await params;

  const user = await requireAdminUser();
  const isSuperAdmin = canCapability(user, "admin-system-roles", "manage");

  if (!isSuperAdmin) {
    redirect("/dashboard/configuration/roles");
  }

  let role: Role | null = null;
  let allPermissions: Permission[] = [];
  let loadFailure: ErrorStateFromError | null = null;

  try {
    [role, allPermissions] = await Promise.all([
      getRoleWithPermissions(roleId),
      listPermissions(),
    ]);
  } catch (error) {
    loadFailure = errorStateFromError(error);
  }

  if (!loadFailure && !role) {
    notFound();
  }

  if (role?.role_name === "super-admin") {
    redirect("/dashboard/configuration/roles");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <PageHeader
          title={
            role
              ? t("editTitle", { name: translateRole(role.role_name) })
              : t("editTitleFallback")
          }
          description={t("description")}
          className="flex-1"
          breadcrumbs={[
            { label: tNav("configuration"), href: "/dashboard/configuration" },
            { label: tNav("rbac_roles"), href: "/dashboard/configuration/roles" },
            { label: role ? translateRole(role.role_name) : t("editTitleFallback") },
          ]}
        />
      </div>

      {loadFailure ? <ErrorState kind={loadFailure.kind} {...(loadFailure.detail ? { detail: loadFailure.detail } : {})} retry /> : null}

      {!loadFailure && role ? <EditRoleForm role={role} allPermissions={allPermissions} /> : null}
    </div>
  );
}
