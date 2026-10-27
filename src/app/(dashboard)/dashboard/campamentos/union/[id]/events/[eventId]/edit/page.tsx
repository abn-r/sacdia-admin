import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import UnionCamporeeDetailPage from "../../../page";
import {
  loadEditCamporeeEventFormData,
  camporeeEventsListHref,
  resolveEventFormData,
} from "@/lib/camporee-events/event-form-data";

type Params = Promise<{ id: string; eventId: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Editar evento" };
}

export default async function UnionCamporeeEventEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id, eventId } = await params;
  const props = resolveEventFormData(await loadEditCamporeeEventFormData(user, "union", id, eventId));
  const t = await getTranslations("camporees.eventInstanceForm");

  // Direct load / refresh: agenda underneath, form in the modal on top.
  return (
    <>
      <UnionCamporeeDetailPage params={params} searchParams={Promise.resolve({ tab: "events" })} />
      <RouteFormModal
        title={t("titleEdit")}
        description={t("descriptionEdit")}
        className="sm:max-w-3xl"
        dismissHref={camporeeEventsListHref("union", id)}
      >
        <EventFormPage {...props} />
      </RouteFormModal>
    </>
  );
}
