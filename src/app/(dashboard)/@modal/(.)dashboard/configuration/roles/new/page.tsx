import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CreateRoleForm } from "@/components/rbac/role-form";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadNewRoleFormData } from "@/lib/rbac/new-role-form-data";

export default async function ConfigurationNewRoleModal() {
  const t = await getTranslations("rbac.pages.rolesNew");
  const user = await requireAdminUser();

  // Same gate as the full page and `loadNewRoleFormData` (`admin-system-roles.manage`).
  if (!canCapability(user, "admin-system-roles", "manage")) {
    return (
      <FormModalForbidden title={t("title")} description={t("description")} className="sm:max-w-3xl" />
    );
  }

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
