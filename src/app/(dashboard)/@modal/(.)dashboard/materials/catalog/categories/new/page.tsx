import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { requireAdminUser } from "@/lib/auth/session";
import { loadCategoryFormData } from "@/lib/materials/catalog-form-data";
import { CategoryForm } from "@/app/(dashboard)/dashboard/materials/catalog/_components/category-form";

export default async function NewCategoryModal() {
  const user = await requireAdminUser();
  const t = await getTranslations("ops.materials.form.category");

  const data = await loadCategoryFormData(user);
  if (!data) return <FormModalForbidden title={t("createTitle")} description={t("createDescription")} />;

  return (
    <RouteFormModal title={t("createTitle")} description={t("createDescription")}>
      <CategoryForm />
    </RouteFormModal>
  );
}
