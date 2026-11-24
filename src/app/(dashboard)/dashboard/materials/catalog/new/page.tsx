import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { requireAdminUser } from "@/lib/auth/session";
import { loadProductFormData } from "@/lib/materials/catalog-form-data";
import { MATERIALS_CATALOG_HREF } from "@/lib/materials/routes";
import { ProductForm } from "../_components/product-form";
import CatalogPage from "../page";

/** Direct load of /catalog/new: the catalog renders underneath, the form opens as the same modal. */
export default async function NewProductPage() {
  const user = await requireAdminUser();
  const data = await loadProductFormData(user);
  if (!data) notFound();
  const t = await getTranslations("ops.materials.form.product");

  return (
    <>
      <CatalogPage searchParams={Promise.resolve({})} />
      <RouteFormModal dismissHref={MATERIALS_CATALOG_HREF} title={t("createTitle")} description={t("createDescription")}>
        <ProductForm
          categories={data.categories}
          localFields={data.localFields}
          actorLocalFieldId={data.actorLocalFieldId}
        />
      </RouteFormModal>
    </>
  );
}
