import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { NewUserForm } from "@/components/users/new-user-form";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadNewUserFormData } from "@/lib/users/new-user-form-data";

export default async function NewUserModal() {
  const currentUser = await requireAdminUser();
  const t = await getTranslations("users.pages.new");

  // Same gate as the full page and `loadNewUserFormData` (`users.create`).
  if (!canCapability(currentUser, "users", "create")) {
    return <FormModalForbidden title={t("title")} description={t("description")} />;
  }

  const data = await loadNewUserFormData(currentUser);
  if (!data) {
    return <FormModalForbidden title={t("title")} description={t("description")} />;
  }

  return (
    <RouteFormModal title={t("title")} description={t("description")}>
      <NewUserForm allowedRoles={data.allowedRoles} geography={data.geography} />
    </RouteFormModal>
  );
}
