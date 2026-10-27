import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import { loadEditCamporeeEventFormData, resolveEventFormData } from "@/lib/camporee-events/event-form-data";

type Params = Promise<{ id: string; eventId: string }>;

export default async function LocalCamporeeEventEditModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id, eventId } = await params;
  const props = resolveEventFormData(await loadEditCamporeeEventFormData(user, "local", id, eventId));
  const t = await getTranslations("camporees.eventInstanceForm");

  return (
    <RouteFormModal title={t("titleEdit")} description={t("descriptionEdit")} className="sm:max-w-3xl">
      <EventFormPage {...props} />
    </RouteFormModal>
  );
}
