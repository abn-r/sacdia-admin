import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { NewUserForm } from "@/components/users/new-user-form";
import { requireAdminUser } from "@/lib/auth/session";
import { loadNewUserFormData } from "@/lib/users/new-user-form-data";

export default async function NewUserModal() {
  const currentUser = await requireAdminUser();
  const data = await loadNewUserFormData(currentUser);
  if (!data) {
    notFound();
  }
  const t = await getTranslations("users.pages.new");

  return (
    <RouteFormModal title={t("title")} description={t("description")}>
      <NewUserForm allowedRoles={data.allowedRoles} geography={data.geography} />
    </RouteFormModal>
  );
}
