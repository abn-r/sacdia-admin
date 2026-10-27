import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EventTemplateFormPage } from "@/components/camporee-events/event-template-form-page";
import { requireAdminUser } from "@/lib/auth/session";
import EventTemplatesPage from "../page";
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

  // Direct load / refresh: template list underneath, form in the modal on top.
  return (
    <>
      <EventTemplatesPage searchParams={Promise.resolve({})} />
      <RouteFormModal
        title={t("createTitle")}
        description={t("description")}
        dismissHref={EVENT_TEMPLATES_LIST_HREF}
      >
        <EventTemplateFormPage {...props} />
      </RouteFormModal>
    </>
  );
}
