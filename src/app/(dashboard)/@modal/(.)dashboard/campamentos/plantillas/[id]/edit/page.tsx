import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { EventTemplateFormPage } from "@/components/camporee-events/event-template-form-page";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadEditEventTemplateFormData,
  resolveEventTemplateFormData,
} from "@/lib/camporee-events/event-template-form-data";

type Params = Promise<{ id: string }>;

export default async function EventTemplateEditModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const t = await getTranslations("camporeeEvents.templates");

  // Same gate as the full page (`campamentos-plantillas.update`).
  if (!canCapability(user, "campamentos-plantillas", "update")) {
    return <FormModalForbidden title={t("editTitle")} description={t("description")} />;
  }

  const props = resolveEventTemplateFormData(await loadEditEventTemplateFormData(user, id));

  return (
    <RouteFormModal title={t("editTitle")} description={t("description")}>
      <EventTemplateFormPage {...props} />
    </RouteFormModal>
  );
}
