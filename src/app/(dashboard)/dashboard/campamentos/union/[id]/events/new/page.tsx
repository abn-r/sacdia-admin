import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FormPageFrame } from "@/components/shared/form-modal";
import { EventFormPage } from "@/components/camporee-events/event-form-page";
import { requireAdminUser } from "@/lib/auth/session";
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

  // Direct load / refresh: the form renders as its own page.
  return (
    <FormPageFrame
      title={t("titleCreate")}
      description={t("descriptionCreate")}
      backHref={camporeeEventsListHref("union", id)}
      backLabel={t("backToEvents")}
    >
      <EventFormPage {...props} />
    </FormPageFrame>
  );
}
