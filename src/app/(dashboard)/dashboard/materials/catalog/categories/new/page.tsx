import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { requireAdminUser } from "@/lib/auth/session";
import { loadCategoryFormData } from "@/lib/materials/catalog-form-data";
import { MATERIALS_CATALOG_HREF } from "@/lib/materials/routes";
import { CategoryForm } from "../../_components/category-form";
import CatalogPage from "../../page";

export default async function NewCategoryPage() {
  const user = await requireAdminUser();
  const data = await loadCategoryFormData(user);
  if (!data) notFound();
  const t = await getTranslations("ops.materials.form.category");

  return (
    <>
      <CatalogPage searchParams={Promise.resolve({ tab: "categories" })} />
      <RouteFormModal
        dismissHref={`${MATERIALS_CATALOG_HREF}?tab=categories`}
        title={t("createTitle")}
        description={t("createDescription")}
      >
        <CategoryForm />
      </RouteFormModal>
    </>
  );
}
