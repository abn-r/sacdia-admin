import { Grid3X3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { requireAdminUser } from "@/lib/auth/session";
import { listRoles, listPermissions } from "@/lib/rbac/service";
import { syncRolePermissionsAction } from "@/lib/rbac/actions";
import type { Role, Permission } from "@/lib/rbac/types";
import { ApiError } from "@/lib/api/client";

export default async function MatrixPage() {
  const t = await getTranslations("rbac.pages.matrix");
  await requireAdminUser();

  let roles: Role[] = [];
  let permissions: Permission[] = [];
  let loadError: string | null = null;

  try {
    [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadError");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && (roles.length === 0 || permissions.length === 0) && (
        <EmptyState
          icon={Grid3X3}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}
    </div>
  );
}
