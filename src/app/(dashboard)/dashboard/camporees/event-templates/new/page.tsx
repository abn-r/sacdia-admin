import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREES_CREATE,
} from "@/lib/auth/permissions";
import { listAdminCamporeeEventTypes, listAdminUnions, listAdminLocalFields } from "@/lib/api/generic-catalogs-i18n";
import { listClasses } from "@/lib/api/classes";
import { createCamporeeEventTemplateAction } from "@/lib/camporee-events/actions";
import {
  EventTemplateFormPage,
  type EventTypeOption,
  type UnionOption,
  type LocalFieldOption,
} from "@/components/camporee-events/event-template-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { ProgressiveClass } from "@/lib/api/classes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporeeEvents.templates");
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

export default async function EventTemplateNewPage() {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE]);
  if (!canCreate) {
    redirect("/dashboard/camporees/event-templates");
  }

  let eventTypes: EventTypeOption[] = [];
  let unions: UnionOption[] = [];
  let localFields: LocalFieldOption[] = [];
  let classes: ProgressiveClass[] = [];

  // Best-effort parallel fetches
  const [etRes, unionsRes, lfRes, classesRes] = await Promise.allSettled([
    listAdminCamporeeEventTypes({ active: true, limit: 200 }),
    listAdminUnions({ limit: 200 }),
    listAdminLocalFields({ limit: 500 }),
    listClasses({ limit: 200 }),
  ]);

  if (etRes.status === "fulfilled") {
    eventTypes = buildEventTypeOptions(etRes.value);
  }
  if (unionsRes.status === "fulfilled") {
    unions = buildUnionOptions(unionsRes.value);
  }
  if (lfRes.status === "fulfilled") {
    localFields = buildLocalFieldOptions(lfRes.value);
  }
  if (classesRes.status === "fulfilled") {
    const payload = classesRes.value;
    const items = Array.isArray(payload?.data) ? payload.data : [];
    classes = items as ProgressiveClass[];
  }

  return (
    <EventTemplateFormPage
      mode="create"
      eventTypes={eventTypes}
      unions={unions}
      localFields={localFields}
      classes={classes}
      action={createCamporeeEventTemplateAction}
    />
  );
}
