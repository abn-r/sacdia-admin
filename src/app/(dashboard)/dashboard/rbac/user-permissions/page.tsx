import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { listPermissions } from "@/lib/rbac/service";
import { ApiError } from "@/lib/api/client";
import type { Permission } from "@/lib/rbac/types";
import { UserPermissionsSearch } from "@/components/rbac/user-permissions-search";
import { redirect } from "next/navigation";

export default async function UserPermissionsPage() {
  const t = await getTranslations("rbac.pages.userPermissions");
  const user = await requireAdminUser();
  if (!extractRoles(user).includes(SUPER_ADMIN_ROLE)) {
    redirect("/dashboard/configuration/permissions");
  }

  let allPermissions: Permission[] = [];
  let loadError: string | null = null;

  try {
    allPermissions = await listPermissions();
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
        <>
          <EndpointErrorBanner state="missing" detail={loadError} />
          <EmptyState
            icon={ShieldCheck}
            title={t("emptyLoadTitle")}
            description={loadError}
          />
        </>
      )}

      {!loadError && (
        <UserPermissionsSearch allPermissions={allPermissions} />
      )}
    </div>
  );
}
