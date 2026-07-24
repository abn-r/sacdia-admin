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

export default async function ConfigurationEditRolePage({ params }: EditRolePageProps) {
  const t = await getTranslations("rbac.pages.rolesDetail");
  const tNav = await getTranslations("nav.items");
  const tRoles = await getTranslations("roles");
  const translateRole = buildRoleTranslator(tRoles);
  const { roleId } = await params;

  const user = await requireAdminUser();
  const isSuperAdmin = extractRoles(user).includes(SUPER_ADMIN_ROLE);

  if (!isSuperAdmin) {
    redirect("/dashboard/configuration/roles");
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

  if (!loadError && !role) {
    notFound();
  }

  if (role?.role_name === "super-admin") {
    redirect("/dashboard/configuration/roles");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/configuration/roles" aria-label={t("backAriaLabel")}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
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

      {loadError ? (
        <>
          <EndpointErrorBanner state="missing" detail={loadError} />
          <EmptyState icon={ShieldCheck} title={t("emptyLoadTitle")} description={loadError} />
        </>
      ) : null}

      {!loadError && role ? <EditRoleForm role={role} allPermissions={allPermissions} /> : null}
    </div>
  );
}
