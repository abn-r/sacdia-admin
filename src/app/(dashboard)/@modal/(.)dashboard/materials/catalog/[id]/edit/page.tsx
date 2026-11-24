import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { requireAdminUser } from "@/lib/auth/session";
import { loadProductFormData } from "@/lib/materials/catalog-form-data";
import { ProductForm } from "@/app/(dashboard)/dashboard/materials/catalog/_components/product-form";

type Params = Promise<{ id: string }>;

export default async function EditProductModal({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireAdminUser();
  const t = await getTranslations("ops.materials.form.product");

  // Missing product or no permission: same forbidden frame (no existence leak).
  const data = await loadProductFormData(user, id);
  if (!data?.product) return <FormModalForbidden title={t("editTitle")} description={t("editDescription")} />;

  return (
    <RouteFormModal title={t("editTitle")} description={t("editDescription")}>
      <ProductForm
        categories={data.categories}
        localFields={data.localFields}
        actorLocalFieldId={data.actorLocalFieldId}
        product={data.product}
      />
    </RouteFormModal>
  );
}
