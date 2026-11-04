import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import { camporeeScreenId, canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadEditCamporeeEventFormData, resolveEventFormData } from "@/lib/camporee-events/event-form-data";

type Params = Promise<{ id: string; eventId: string }>;

export default async function LocalCamporeeEventEditModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id, eventId } = await params;
  const t = await getTranslations("camporees.eventInstanceForm");

  // Same gate as the full page (`events.update` of the camporee screen).
  if (!canCapability(user, camporeeScreenId("local"), "events.update")) {
    return (
      <FormModalForbidden title={t("titleEdit")} description={t("descriptionEdit")} className="sm:max-w-3xl" />
    );
  }

  const props = resolveEventFormData(await loadEditCamporeeEventFormData(user, "local", id, eventId));

  return (
    <RouteFormModal title={t("titleEdit")} description={t("descriptionEdit")} className="sm:max-w-3xl">
      <EventFormPage {...props} />
    </RouteFormModal>
  );
}
