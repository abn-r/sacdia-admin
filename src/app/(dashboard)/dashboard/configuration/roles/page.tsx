import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CopyRolePermissionsDialog } from "@/components/rbac/copy-role-permissions-dialog";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { listRoles } from "@/lib/rbac/service";
import { ApiError } from "@/lib/api/client";
import type { Role } from "@/lib/rbac/types";

const RolesTable = dynamic(
  () => import("@/components/rbac/roles-table").then((m) => ({ default: m.RolesTable })),
  {
    loading: () => (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    ),
  },
);

export default async function ConfigurationRolesPage() {
  const t = await getTranslations("rbac.pages.roles");
  const tNav = await getTranslations("nav.items");
  const user = await requireAdminUser();
  const isSuperAdmin = extractRoles(user).includes(SUPER_ADMIN_ROLE);

  let roles: Role[] = [];
  let loadError: string | null = null;

  try {
    roles = await listRoles("all");
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadError");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[
          { label: tNav("configuration"), href: "/dashboard/configuration" },
          { label: t("title") },
        ]}
        actions={
          isSuperAdmin ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!loadError && roles.length > 0 ? (
                <CopyRolePermissionsDialog roles={roles} />
              ) : null}
              <Button asChild>
                <Link href="/dashboard/configuration/roles/new">
                  <Plus className="size-4" />
                  {t("newRole")}
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {loadError ? (
        <>
          <EndpointErrorBanner state="missing" detail={loadError} />
          <EmptyState icon={ShieldCheck} title={t("emptyLoadTitle")} description={loadError} />
        </>
      ) : null}

      {!loadError && roles.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("emptyTitle")} description={t("emptyDescription")}>
          {isSuperAdmin ? (
            <Button asChild>
              <Link href="/dashboard/configuration/roles/new">
                <Plus className="size-4" />
                {t("newRole")}
              </Link>
            </Button>
          ) : null}
        </EmptyState>
      ) : null}

      {!loadError && roles.length > 0 ? (
        <RolesTable roles={roles} isSuperAdmin={isSuperAdmin} />
      ) : null}
    </div>
  );
}
