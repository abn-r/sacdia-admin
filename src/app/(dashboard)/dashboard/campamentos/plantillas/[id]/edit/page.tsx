import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FormPageFrame } from "@/components/shared/form-modal";
import { EventTemplateFormPage } from "@/components/camporee-events/event-template-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import {
  EVENT_TEMPLATES_LIST_HREF,
  loadEditEventTemplateFormData,
  resolveEventTemplateFormData,
} from "@/lib/camporee-events/event-template-form-data";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporeeEvents.templates");
  return { title: t("editTitle") };
}

export default async function EventTemplateEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  const { id } = await params;
  const props = resolveEventTemplateFormData(await loadEditEventTemplateFormData(user, id));
  const t = await getTranslations("camporeeEvents.templates");

  // Direct load / refresh: the form renders as its own page.
  return (
    <FormPageFrame
      title={t("editTitle")}
      description={t("description")}
      backHref={EVENT_TEMPLATES_LIST_HREF}
      backLabel={t("backToList")}
    >
      <EventTemplateFormPage {...props} />
    </FormPageFrame>
  );
}
