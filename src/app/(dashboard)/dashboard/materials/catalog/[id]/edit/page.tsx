import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { requireAdminUser } from "@/lib/auth/session";
import { loadProductFormData } from "@/lib/materials/catalog-form-data";
import { MATERIALS_CATALOG_HREF } from "@/lib/materials/routes";
import { ProductForm } from "../../_components/product-form";
import CatalogPage from "../../page";

type Params = Promise<{ id: string }>;

export default async function EditProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireAdminUser();
  const data = await loadProductFormData(user, id);
  if (!data?.product) notFound();
  const t = await getTranslations("ops.materials.form.product");

  return (
    <>
      <CatalogPage searchParams={Promise.resolve({})} />
      <RouteFormModal dismissHref={MATERIALS_CATALOG_HREF} title={t("editTitle")} description={t("editDescription")}>
        <ProductForm
          categories={data.categories}
          localFields={data.localFields}
          actorLocalFieldId={data.actorLocalFieldId}
          product={data.product}
        />
      </RouteFormModal>
    </>
  );
}
