import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREES_UPDATE,
} from "@/lib/auth/permissions";
import { listAdminCamporeeEventTypes } from "@/lib/api/generic-catalogs-i18n";
import { listClasses } from "@/lib/api/classes";
import { updateCamporeeEventAction } from "@/lib/camporee-events/actions";
import type { CamporeeEventActionState } from "@/lib/camporee-events/actions";
import {
  EventTemplateFormPage,
  type EventTypeOption,
} from "@/components/camporee-events/event-template-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { ProgressiveClass } from "@/lib/api/classes";
import type {
  CamporeeEventTemplate,
  PenaltyRule,
  ParticipantsByClass,
} from "@/lib/api/camporee-events";
import { apiRequest } from "@/lib/api/client";

type Params = Promise<{ id: string; eventId: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporeeEvents.instances");
  return { title: t("editTitle") };
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

function toEventAsTemplate(raw: unknown): CamporeeEventTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const record =
    r.camporee_event_id != null ? r : ((r.data as Record<string, unknown>) ?? r);

  const id =
    typeof record.camporee_event_id === "number"
      ? record.camporee_event_id
      : Number(record.camporee_event_id);

  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    // Reuse event_template_id slot with camporee_event_id so EventTemplateFormPage
    // sends the right hidden "id" field.
    event_template_id: id,
    scope: "union", // unused for instances — just satisfies the type
    event_type_id:
      typeof record.event_type_id === "number" ? record.event_type_id : 0,
    title: typeof record.title === "string" ? record.title : "",
    description: typeof record.description === "string" ? record.description : null,
    requirements: typeof record.requirements === "string" ? record.requirements : null,
    development: typeof record.development === "string" ? record.development : null,
    prerequisites: typeof record.prerequisites === "string" ? record.prerequisites : null,
    materials: typeof record.materials === "string" ? record.materials : null,
    auxiliaries: typeof record.auxiliaries === "string" ? record.auxiliaries : null,
    max_points: typeof record.max_points === "number" ? record.max_points : 0,
    min_points: typeof record.min_points === "number" ? record.min_points : 0,
    penalties: Array.isArray(record.penalties) ? (record.penalties as PenaltyRule[]) : [],
    participants_mode: record.participants_mode === "by_class" ? "by_class" : "count",
    participants_count:
      typeof record.participants_count === "number" ? record.participants_count : null,
    participants_by_class: Array.isArray(record.participants_by_class)
      ? (record.participants_by_class as ParticipantsByClass[])
      : null,
    duration_seconds:
      typeof record.duration_seconds === "number" ? record.duration_seconds : null,
    active: record.active !== false,
  };
}

export default async function LocalCamporeeEventEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE]);
  if (!canEdit) {
    redirect("/dashboard/camporees");
  }

  const { id: idParam, eventId: eventIdParam } = await params;
  const camporeeId = Number(idParam);
  const eventId = Number(eventIdParam);
  if (!Number.isFinite(camporeeId) || camporeeId <= 0) notFound();
  if (!Number.isFinite(eventId) || eventId <= 0) notFound();

  const [rawEvent, etRes, classesRes] = await Promise.allSettled([
    apiRequest<unknown>(`/camporee-events/${eventId}`),
    listAdminCamporeeEventTypes({ active: true, limit: 200 }),
    listClasses({ limit: 200 }),
  ]);

  const item =
    rawEvent.status === "fulfilled" ? toEventAsTemplate(rawEvent.value) : null;
  if (!item) notFound();

  const eventTypes =
    etRes.status === "fulfilled" ? buildEventTypeOptions(etRes.value) : [];

  let classes: ProgressiveClass[] = [];
  if (classesRes.status === "fulfilled") {
    const payload = classesRes.value;
    classes = Array.isArray(payload?.data) ? (payload.data as ProgressiveClass[]) : [];
  }

  // Bind camporee_id and id (event id) to the update action.
  async function boundAction(
    prev: CamporeeEventActionState,
    formData: FormData,
  ) {
    "use server";
    formData.set("id", String(eventId));
    formData.set("camporee_id", String(camporeeId));
    formData.set("is_union", "false");
    return updateCamporeeEventAction(prev, formData);
  }

  return (
    <EventTemplateFormPage
      mode="edit"
      item={item}
      eventTypes={eventTypes}
      unions={[]}
      localFields={[]}
      classes={classes}
      action={boundAction}
    />
  );
}
