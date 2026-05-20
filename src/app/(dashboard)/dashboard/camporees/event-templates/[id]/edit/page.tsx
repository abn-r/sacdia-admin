import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREES_UPDATE,
} from "@/lib/auth/permissions";
import {
  getCamporeeEventTemplate,
  type CamporeeEventTemplate,
  type PenaltyRule,
  type ParticipantsByClass,
} from "@/lib/api/camporee-events";
import {
  listAdminCamporeeEventTypes,
  listAdminUnions,
  listAdminLocalFields,
} from "@/lib/api/generic-catalogs-i18n";
import { listClasses } from "@/lib/api/classes";
import { updateCamporeeEventTemplateAction } from "@/lib/camporee-events/actions";
import {
  EventTemplateFormPage,
  type EventTypeOption,
  type UnionOption,
  type LocalFieldOption,
} from "@/components/camporee-events/event-template-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { ProgressiveClass } from "@/lib/api/classes";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporeeEvents.templates");
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

function buildUnionOptions(payload: unknown): UnionOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.union_id === "number" ? item.union_id : Number(item.union_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is UnionOption => x !== null);
}

function buildLocalFieldOptions(payload: unknown): LocalFieldOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.local_field_id === "number"
          ? item.local_field_id
          : Number(item.local_field_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is LocalFieldOption => x !== null);
}

function toTemplateRecord(raw: unknown): CamporeeEventTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const record = r.event_template_id != null ? r : ((r.data as Record<string, unknown>) ?? r);

  const id =
    typeof record.event_template_id === "number"
      ? record.event_template_id
      : Number(record.event_template_id);

  if (!Number.isFinite(id) || id <= 0) return null;

  const scope = record.scope === "union" || record.scope === "local_field"
    ? record.scope
    : "union";

  return {
    event_template_id: id,
    scope,
    union_id:
      typeof record.union_id === "number" ? record.union_id : Number(record.union_id) || null,
    local_field_id:
      typeof record.local_field_id === "number"
        ? record.local_field_id
        : Number(record.local_field_id) || null,
    event_type_id:
      typeof record.event_type_id === "number" ? record.event_type_id : Number(record.event_type_id) || 0,
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
    participants_mode:
      record.participants_mode === "by_class" ? "by_class" : "count",
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

export default async function EventTemplateEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE]);
  if (!canEdit) {
    redirect("/dashboard/camporees/event-templates");
  }

  const { id: idParam } = await params;
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  // Parallel fetches: template + reference data
  const [rawTemplate, etRes, unionsRes, lfRes, classesRes] = await Promise.allSettled([
    getCamporeeEventTemplate(numericId),
    listAdminCamporeeEventTypes({ active: true, limit: 200 }),
    listAdminUnions({ limit: 200 }),
    listAdminLocalFields({ limit: 500 }),
    listClasses({ limit: 200 }),
  ]);

  const item =
    rawTemplate.status === "fulfilled" ? toTemplateRecord(rawTemplate.value) : null;
  if (!item) notFound();

  const eventTypes =
    etRes.status === "fulfilled" ? buildEventTypeOptions(etRes.value) : [];
  const unions =
    unionsRes.status === "fulfilled" ? buildUnionOptions(unionsRes.value) : [];
  const localFields =
    lfRes.status === "fulfilled" ? buildLocalFieldOptions(lfRes.value) : [];

  let classes: ProgressiveClass[] = [];
  if (classesRes.status === "fulfilled") {
    const payload = classesRes.value;
    const items = Array.isArray(payload?.data) ? payload.data : [];
    classes = items as ProgressiveClass[];
  }

  return (
    <EventTemplateFormPage
      mode="edit"
      item={item}
      eventTypes={eventTypes}
      unions={unions}
      localFields={localFields}
      classes={classes}
      action={updateCamporeeEventTemplateAction}
    />
  );
}
