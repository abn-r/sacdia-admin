import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { ResourceUploadForm } from "@/components/resources/resource-upload-form";
import { loadResourceFormData } from "@/components/resources/resource-form-data";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

export default async function NewResourceModal() {
  const user = await requireAdminUser();
  const t = await getTranslations("ops.resources");

  if (!canCapability(user, "resources-list", "create")) {
    return <FormModalForbidden title={t("upload.title")} description={t("upload.description")} />;
  }

  const data = await loadResourceFormData(user);

  return (
    <RouteFormModal title={t("upload.title")} description={t("upload.description")}>
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
  );
}
