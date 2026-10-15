import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import UnionCamporeeDetailPage from "../../page";
import {
  loadCreateCamporeeEventFormData,
  camporeeEventsListHref,
  resolveEventFormData,
} from "@/lib/camporee-events/event-form-data";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Nuevo evento" };
}

export default async function UnionCamporeeEventNewPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const props = resolveEventFormData(await loadCreateCamporeeEventFormData(user, "union", id));
  const t = await getTranslations("camporees.eventInstanceForm");

  // Direct load / refresh: agenda underneath, form in the modal on top.
  return (
    <>
      <UnionCamporeeDetailPage params={params} searchParams={Promise.resolve({ tab: "events" })} />
      <RouteFormModal
        title={t("titleCreate")}
        description={t("descriptionCreate")}
        className="sm:max-w-3xl"
        dismissHref={camporeeEventsListHref("union", id)}
      >
        <EventFormPage {...props} />
      </RouteFormModal>
    </>
  );
}
