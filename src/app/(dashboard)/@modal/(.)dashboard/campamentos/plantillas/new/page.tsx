import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EventTemplateFormPage } from "@/components/camporee-events/event-template-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadCreateEventTemplateFormData,
  resolveEventTemplateFormData,
} from "@/lib/camporee-events/event-template-form-data";

export default async function EventTemplateNewModal() {
  const user = await requireAdminUser();
  const props = resolveEventTemplateFormData(await loadCreateEventTemplateFormData(user));
  const t = await getTranslations("camporeeEvents.templates");

  return (
    <RouteFormModal title={t("createTitle")} description={t("description")}>
      <EventTemplateFormPage {...props} />
    </RouteFormModal>
  );
}
