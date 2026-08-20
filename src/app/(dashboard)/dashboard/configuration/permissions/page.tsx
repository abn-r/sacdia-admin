import { Key } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PermissionsTable } from "@/components/rbac/permissions-table";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { listPermissions } from "@/lib/rbac/service";
import {
  createPermissionAction,
  updatePermissionAction,
  deletePermissionAction,
} from "@/lib/rbac/actions";
import type { Permission } from "@/lib/rbac/types";
import { ApiError } from "@/lib/api/client";

export default async function ConfigurationPermissionsPage() {
  const t = await getTranslations("rbac.pages.permissions");
  const tNav = await getTranslations("nav.items");
  const user = await requireAdminUser();
  const canWrite = extractRoles(user).includes(SUPER_ADMIN_ROLE);

  let items: Permission[] = [];
  let loadError: string | null = null;

  try {
    items = await listPermissions();
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
      />

      {loadError ? (
        <>
          <EndpointErrorBanner state="missing" detail={loadError} />
          <EmptyState icon={Key} title={t("emptyLoadTitle")} description={loadError} />
        </>
      ) : null}

      {!canWrite ? (
        <p className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
          {t("readOnlyBanner")}
        </p>
      ) : null}

      {!loadError ? (
        <PermissionsTable
          items={items}
          createAction={createPermissionAction}
          updateAction={updatePermissionAction}
          deleteAction={deletePermissionAction}
          canWrite={canWrite}
        />
      ) : null}
    </div>
  );
}
