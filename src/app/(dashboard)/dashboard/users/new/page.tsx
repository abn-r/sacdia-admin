import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FormPageFrame } from "@/components/shared/form-modal";
import { NewUserForm } from "@/components/users/new-user-form";
import { requireAdminUser } from "@/lib/auth/session";
import { loadNewUserFormData } from "@/lib/users/new-user-form-data";

export default async function NewUserPage() {
  const currentUser = await requireAdminUser();
  const data = await loadNewUserFormData(currentUser);
  if (!data) {
    notFound();
  }
  const t = await getTranslations("users.pages.new");

  return (
    <FormPageFrame title={t("title")} description={t("description")}>
      <NewUserForm allowedRoles={data.allowedRoles} geography={data.geography} />
    </FormPageFrame>
  );
}
