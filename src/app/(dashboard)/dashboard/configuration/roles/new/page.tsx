import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
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

export default async function ConfigurationNewRolePage() {
  const t = await getTranslations("rbac.pages.rolesNew");
  const tNav = await getTranslations("nav.items");
  const user = await requireAdminUser();
  const isSuperAdmin = extractRoles(user).includes(SUPER_ADMIN_ROLE);

  if (!isSuperAdmin) {
    redirect("/dashboard/configuration/roles");
  }

  let allPermissions: Permission[] = [];
  let loadError: string | null = null;

  try {
    allPermissions = await listPermissions();
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadError");
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
          title={t("title")}
          description={t("description")}
          className="flex-1"
          breadcrumbs={[
            { label: tNav("configuration"), href: "/dashboard/configuration" },
            { label: tNav("rbac_roles"), href: "/dashboard/configuration/roles" },
            { label: t("title") },
          ]}
        />
      </div>

      {loadError ? <EndpointErrorBanner state="missing" detail={loadError} /> : null}

      <CreateRoleForm allPermissions={allPermissions} />
    </div>
  );
}
