import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CreateRoleForm } from "@/components/rbac/role-form";
import { requireAdminUser } from "@/lib/auth/session";
import { loadNewRoleFormData, ROLES_LIST_HREF } from "@/lib/rbac/new-role-form-data";
import ConfigurationRolesPage from "../page";

/**
 * Direct load / refresh: the roles list renders underneath and the form opens
 * as the same modal the intercepted route shows.
 */
export default async function ConfigurationNewRolePage() {
  const t = await getTranslations("rbac.pages.rolesNew");
  const user = await requireAdminUser();
  const data = await loadNewRoleFormData(user);

  return (
    <>
      <ConfigurationRolesPage />
      <RouteFormModal
        title={t("title")}
        description={t("description")}
        className="sm:max-w-3xl"
        dismissHref={ROLES_LIST_HREF}
      >
        {data.loadError ? (
          <div className="px-6 pb-4">
            <EndpointErrorBanner state="missing" detail={data.loadError} />
          </div>
        ) : null}
        <CreateRoleForm allPermissions={data.allPermissions} />
      </RouteFormModal>
    </>
  );
}
