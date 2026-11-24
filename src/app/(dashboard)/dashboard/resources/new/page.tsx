import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { ResourceUploadForm } from "@/components/resources/resource-upload-form";
import { loadResourceFormData } from "@/components/resources/resource-form-data";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import ResourcesPage from "../page";

/**
 * Direct load / refresh of /resources/new: the library renders underneath and
 * the upload opens as the same modal the intercepted route shows.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ops.resources");
  return { title: t("upload.title") };
}

export default async function NewResourcePage() {
  const user = await requireAdminUser();
  if (!canCapability(user, "resources-list", "create")) {
    redirect("/dashboard/resources");
  }
  const t = await getTranslations("ops.resources");
  const data = await loadResourceFormData(user);

  return (
    <>
      <ResourcesPage searchParams={Promise.resolve({})} />
      <RouteFormModal
        dismissHref="/dashboard/resources"
        title={t("upload.title")}
        description={t("upload.description")}
      >
        <ResourceUploadForm
          categories={data.categories}
          categoriesFailed={Boolean(data.categoriesFailure)}
          clubTypes={data.clubTypes}
          unions={data.unions}
          localFields={data.localFields}
          allowedScopeLevels={data.allowedScopeLevels}
          lockedScopeId={data.lockedScopeId}
        />
      </RouteFormModal>
    </>
  );
}
