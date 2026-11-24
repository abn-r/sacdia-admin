import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { requireAdminUser } from "@/lib/auth/session";
import { loadProductFormData } from "@/lib/materials/catalog-form-data";
import { ProductForm } from "@/app/(dashboard)/dashboard/materials/catalog/_components/product-form";

export default async function NewProductModal() {
  const user = await requireAdminUser();
  const t = await getTranslations("ops.materials.form.product");

  const data = await loadProductFormData(user);
  if (!data) return <FormModalForbidden title={t("createTitle")} description={t("createDescription")} />;

  return (
    <RouteFormModal title={t("createTitle")} description={t("createDescription")}>
      <ProductForm
        categories={data.categories}
        localFields={data.localFields}
        actorLocalFieldId={data.actorLocalFieldId}
      />
    </RouteFormModal>
  );
}
