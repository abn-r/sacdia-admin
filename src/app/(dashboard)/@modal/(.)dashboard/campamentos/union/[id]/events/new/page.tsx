import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import { loadCreateCamporeeEventFormData, resolveEventFormData } from "@/lib/camporee-events/event-form-data";

type Params = Promise<{ id: string }>;

export default async function UnionCamporeeEventNewModal({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const props = resolveEventFormData(await loadCreateCamporeeEventFormData(user, "union", id));
  const t = await getTranslations("camporees.eventInstanceForm");

  return (
    <RouteFormModal title={t("titleCreate")} description={t("descriptionCreate")} className="sm:max-w-3xl">
      <EventFormPage {...props} />
    </RouteFormModal>
  );
}
