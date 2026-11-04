import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { EventTemplateFormPage } from "@/components/camporee-events/event-template-form-page";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadCreateEventTemplateFormData,
  resolveEventTemplateFormData,
} from "@/lib/camporee-events/event-template-form-data";

export default async function EventTemplateNewModal() {
  const user = await requireAdminUser();
  const t = await getTranslations("camporeeEvents.templates");

  // Same gate as the full page (`campamentos-plantillas.create`).
  if (!canCapability(user, "campamentos-plantillas", "create")) {
    return <FormModalForbidden title={t("createTitle")} description={t("description")} />;
  }

  const props = resolveEventTemplateFormData(await loadCreateEventTemplateFormData(user));

  return (
    <RouteFormModal title={t("createTitle")} description={t("description")}>
      <EventTemplateFormPage {...props} />
    </RouteFormModal>
  );
}
