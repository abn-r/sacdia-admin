import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREES_CREATE,
} from "@/lib/auth/permissions";
import { listAdminCamporeeEventTypes } from "@/lib/api/generic-catalogs-i18n";
import { listClasses } from "@/lib/api/classes";
import { createLocalCamporeeEventAction } from "@/lib/camporee-events/actions";
import {
  EventTemplateFormPage,
  type EventTypeOption,
} from "@/components/camporee-events/event-template-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { ProgressiveClass } from "@/lib/api/classes";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporeeEvents.instances");
  return { title: t("createTitle") };
}

function buildEventTypeOptions(payload: unknown): EventTypeOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.event_type_id === "number"
          ? item.event_type_id
          : Number(item.event_type_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is EventTypeOption => x !== null);
}

export default async function LocalCamporeeEventNewPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE]);
  if (!canCreate) {
    redirect("/dashboard/camporees");
  }

  const { id: idParam } = await params;
  const camporeeId = Number(idParam);
  if (!Number.isFinite(camporeeId) || camporeeId <= 0) notFound();

  let eventTypes: EventTypeOption[] = [];
  let classes: ProgressiveClass[] = [];

  const [etRes, classesRes] = await Promise.allSettled([
    listAdminCamporeeEventTypes({ active: true, limit: 200 }),
    listClasses({ limit: 200 }),
  ]);

  if (etRes.status === "fulfilled") {
    eventTypes = buildEventTypeOptions(etRes.value);
  }
  if (classesRes.status === "fulfilled") {
    const payload = classesRes.value;
    classes = Array.isArray(payload?.data) ? (payload.data as ProgressiveClass[]) : [];
  }

  // Bind camporee_id so the action knows which camporee to create for.
  // We wrap the action to inject camporee_id into formData before delegating.
  async function boundAction(
    prev: import("@/lib/camporee-events/actions").CamporeeEventActionState,
    formData: FormData,
  ) {
    "use server";
    formData.set("camporee_id", String(camporeeId));
    return createLocalCamporeeEventAction(prev, formData);
  }

  return (
    <EventTemplateFormPage
      mode="create"
      eventTypes={eventTypes}
      // scope/union/localField not needed for instances — pass empty arrays
      unions={[]}
      localFields={[]}
      classes={classes}
      action={boundAction}
    />
  );
}
