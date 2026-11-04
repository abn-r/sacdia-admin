import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import { camporeeScreenId, canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadCreateCamporeeEventFormData, resolveEventFormData } from "@/lib/camporee-events/event-form-data";

type Params = Promise<{ id: string }>;

export default async function UnionCamporeeEventNewModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const t = await getTranslations("camporees.eventInstanceForm");

  // Same gate as the full page (`events.create` of the camporee screen).
  if (!canCapability(user, camporeeScreenId("union"), "events.create")) {
    return (
      <FormModalForbidden title={t("titleCreate")} description={t("descriptionCreate")} className="sm:max-w-3xl" />
    );
  }

  const props = resolveEventFormData(await loadCreateCamporeeEventFormData(user, "union", id));

  return (
    <RouteFormModal title={t("titleCreate")} description={t("descriptionCreate")} className="sm:max-w-3xl">
      <EventFormPage {...props} />
    </RouteFormModal>
  );
}
