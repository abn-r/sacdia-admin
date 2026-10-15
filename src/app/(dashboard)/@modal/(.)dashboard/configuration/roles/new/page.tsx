import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CreateRoleForm } from "@/components/rbac/role-form";
import { requireAdminUser } from "@/lib/auth/session";
import { loadNewRoleFormData } from "@/lib/rbac/new-role-form-data";

export default async function ConfigurationNewRoleModal() {
  const t = await getTranslations("rbac.pages.rolesNew");
  const user = await requireAdminUser();
  const data = await loadNewRoleFormData(user);

  return (
    <RouteFormModal title={t("title")} description={t("description")} className="sm:max-w-3xl">
      {data.loadError ? (
        <div className="px-6 pb-4">
          <EndpointErrorBanner state="missing" detail={data.loadError} />
        </div>
      ) : null}
      <CreateRoleForm allPermissions={data.allPermissions} />
    </RouteFormModal>
  );
}
