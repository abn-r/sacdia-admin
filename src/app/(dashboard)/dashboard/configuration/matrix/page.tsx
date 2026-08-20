import { Grid3X3 } from "lucide-react";
import { getTranslations as getTranslationsStrict } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PermissionsMatrix } from "@/components/rbac/permissions-matrix";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { listRoles, listPermissions } from "@/lib/rbac/service";
import { toggleRolePermissionAction } from "@/lib/rbac/actions";
import type { Role, Permission } from "@/lib/rbac/types";
import { ApiError } from "@/lib/api/client";

type LooseTranslator = (key: string) => string;
const getTranslations = getTranslationsStrict as unknown as (
  namespace?: string,
) => Promise<LooseTranslator>;

export default async function ConfigurationMatrixPage() {
  const t = await getTranslations("rbac.pages.matrix");
  const tNav = await getTranslations("nav.items");
  const user = await requireAdminUser();
  const canWrite = extractRoles(user).includes(SUPER_ADMIN_ROLE);

  let roles: Role[] = [];
  let permissions: Permission[] = [];
  let loadError: string | null = null;

  try {
    [roles, permissions] = await Promise.all([listRoles(), listPermissions()]);
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : t("loadError");
  }

  const hasData = roles.length > 0 && permissions.length > 0;

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

      {loadError ? <EndpointErrorBanner state="missing" detail={loadError} /> : null}

      {!canWrite ? (
        <p className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
          {t("readOnlyBanner")}
        </p>
      ) : null}

      {!loadError && !hasData ? (
        <EmptyState icon={Grid3X3} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : null}

      {!loadError && hasData ? (
        <PermissionsMatrix
          roles={roles}
          permissions={permissions}
          toggleAction={toggleRolePermissionAction}
          canWrite={canWrite}
        />
      ) : null}
    </div>
  );
}
