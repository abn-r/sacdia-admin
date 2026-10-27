import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { NewUserForm } from "@/components/users/new-user-form";
import { requireAdminUser } from "@/lib/auth/session";
import { loadNewUserFormData } from "@/lib/users/new-user-form-data";
import UsersPage from "../page";

/**
 * Direct load / refresh of /users/new: the list renders underneath and the
 * form opens as the same modal the intercepted route shows.
 */
export default async function NewUserPage() {
  const currentUser = await requireAdminUser();
  const data = await loadNewUserFormData(currentUser);
  if (!data) {
    notFound();
  }
  const t = await getTranslations("users.pages.new");

  return (
    <>
      <UsersPage searchParams={Promise.resolve({})} />
      <RouteFormModal
        dismissHref="/dashboard/users"
        title={t("title")}
        description={t("description")}
      >
        <NewUserForm allowedRoles={data.allowedRoles} geography={data.geography} />
      </RouteFormModal>
    </>
  );
}
