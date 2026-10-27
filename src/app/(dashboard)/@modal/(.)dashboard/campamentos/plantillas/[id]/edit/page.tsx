import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EventTemplateFormPage } from "@/components/camporee-events/event-template-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import {
  loadEditEventTemplateFormData,
  resolveEventTemplateFormData,
} from "@/lib/camporee-events/event-template-form-data";

type Params = Promise<{ id: string }>;

export default async function EventTemplateEditModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const props = resolveEventTemplateFormData(await loadEditEventTemplateFormData(user, id));
  const t = await getTranslations("camporeeEvents.templates");

  return (
    <RouteFormModal title={t("editTitle")} description={t("description")}>
      <EventTemplateFormPage {...props} />
    </RouteFormModal>
  );
}
