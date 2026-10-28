import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FormPageFrame } from "@/components/shared/form-modal";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import { requireAdminUser } from "@/lib/auth/session";
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

  // Direct load / refresh: the form renders as its own page.
  return (
    <FormPageFrame
      title={t("titleEdit")}
      description={t("descriptionEdit")}
      backHref={camporeeEventsListHref("union", id)}
      backLabel={t("backToEvents")}
    >
      <EventFormPage {...props} />
    </FormPageFrame>
  );
}
