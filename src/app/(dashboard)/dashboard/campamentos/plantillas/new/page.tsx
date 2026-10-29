import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FormPageFrame } from "@/components/shared/form-modal";
import { EventTemplateFormPage } from "@/components/camporee-events/event-template-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import {
  EVENT_TEMPLATES_LIST_HREF,
  loadCreateEventTemplateFormData,
  resolveEventTemplateFormData,
} from "@/lib/camporee-events/event-template-form-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporeeEvents.templates");
  return { title: t("createTitle") };
}

export default async function EventTemplateNewPage() {
  const user = await requireAdminUser();
  const props = resolveEventTemplateFormData(await loadCreateEventTemplateFormData(user));
  const t = await getTranslations("camporeeEvents.templates");

  // Direct load / refresh: the form renders as its own page.
  return (
    <FormPageFrame
      title={t("createTitle")}
      description={t("description")}
      backHref={EVENT_TEMPLATES_LIST_HREF}
      backLabel={t("backToList")}
    >
      <EventTemplateFormPage {...props} />
    </FormPageFrame>
  );
}
