import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { requireAdminUser } from "@/lib/auth/session";
import { loadCategoryFormData } from "@/lib/materials/catalog-form-data";
import { CategoryForm } from "@/app/(dashboard)/dashboard/materials/catalog/_components/category-form";

type Params = Promise<{ id: string }>;

export default async function EditCategoryModal({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireAdminUser();
  const t = await getTranslations("ops.materials.form.category");

  const data = await loadCategoryFormData(user, id);
  if (!data?.categoria) return <FormModalForbidden title={t("editTitle")} description={t("editDescription")} />;

  return (
    <RouteFormModal title={t("editTitle")} description={t("editDescription")}>
      <CategoryForm categoria={data.categoria} />
    </RouteFormModal>
  );
}
