import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
  listAdminLocalFields,
  listAdminUnions,
} from "@/lib/api/generic-catalogs-i18n";
import { listClasses } from "@/lib/api/classes";
import { resolveAdminTerritoryScope, type AdminTerritoryScope } from "@/lib/auth/territory-scope";
import { updateCamporeeEventTemplateAction } from "@/lib/camporee-events/actions";
import {
  EventTemplateFormPage,
  type AllowedTemplateScope,
  type EventTypeOption,
  type LocalFieldOption,
  type UnionOption,
} from "@/components/camporee-events/event-template-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { ProgressiveClass } from "@/lib/api/classes";

type Params = Promise<{ id: string }>;
type RawCatalogItem = Record<string, unknown>;
type ScopedCatalogItem = "unions" | "local-fields";
type GeographyBundle = {
  unions: RawCatalogItem[];
  localFields: RawCatalogItem[];
};

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildScopeAllowedScopes(scope: AdminTerritoryScope): AllowedTemplateScope[] {
  if (scope.level === "local_field") {
    return ["local_field"];
  }

  return ["union", "local_field"];
}

async function listScopedEntityItems(
  entityKey: ScopedCatalogItem,
  query: Record<string, string> = {},
): Promise<RawCatalogItem[]> {
  try {
    return entityKey === "unions"
      ? ((await listAdminUnions(query)) as RawCatalogItem[])
      : ((await listAdminLocalFields(query)) as RawCatalogItem[]);
  } catch {
    return [];
  }
}

async function listCamporeeEventTemplateGeography(
  scope: AdminTerritoryScope,
): Promise<GeographyBundle> {
  if (scope.level === "local_field") {
    if (!scope.unionId || !scope.localFieldId) {
      return { unions: [], localFields: [] };
    }

    const localFieldsByUnion = await listScopedEntityItems("local-fields", {
      unionId: String(scope.unionId),
    });

    const localFields = localFieldsByUnion.filter(
      (item) => toPositiveNumber(item.local_field_id) === scope.localFieldId,
    );

    const unions = (await listScopedEntityItems("unions")).filter(
      (item) => toPositiveNumber(item.union_id) === scope.unionId,
    );

    return { unions, localFields };
  }

  if (scope.level === "union") {
    if (!scope.unionId) {
      return { unions: [], localFields: [] };
    }

    const [localFields, allUnions] = await Promise.all([
      listScopedEntityItems("local-fields", { unionId: String(scope.unionId) }),
      listScopedEntityItems("unions"),
    ]);

    const unions = allUnions.filter(
      (item) => toPositiveNumber(item.union_id) === scope.unionId,
    );

    return { unions, localFields };
  }

  if (scope.level === "division") {
    const unions = await listScopedEntityItems("unions", {
      divisionId: String(scope.divisionId),
    });

    const localFieldBatches = await Promise.allSettled(
      unions
        .map((union) => toPositiveNumber((union as RawCatalogItem).union_id))
        .filter((value): value is number => value !== null)
        .map((unionId) => listScopedEntityItems("local-fields", { unionId: String(unionId) })),
    );

    const localFields = localFieldBatches
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .map((item) => item as RawCatalogItem);

    return { unions, localFields };
  }

  const [unions, localFields] = await Promise.all([
    listScopedEntityItems("unions"),
    listScopedEntityItems("local-fields"),
  ]);

  return { unions, localFields };
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

function buildClassOptions(payload: unknown): ProgressiveClass[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const source = payload as { data?: unknown };
  if (!Array.isArray(source.data)) {
    return [];
  }

  return source.data as ProgressiveClass[];
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
    scoring_enabled: record.scoring_enabled === true,
    rubrics: Array.isArray(record.rubrics)
      ? (record.rubrics as CamporeeEventTemplate["rubrics"])
      : [],
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camporeeEvents.templates");
  return { title: t("editTitle") };
}

export default async function EventTemplateEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE]);
  if (!canEdit) {
    redirect("/dashboard/campamentos/plantillas");
  }

  const territoryScope = resolveAdminTerritoryScope(user);
  const allowedScopes = buildScopeAllowedScopes(territoryScope);
  const { id: idParam } = await params;
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const [templateRes, etRes, classesRes, geography] = await Promise.all([
    getCamporeeEventTemplate(numericId).catch(() => null),
    listAdminCamporeeEventTypes({ active: true, limit: 200 }).catch(() => null),
    listClasses({ limit: 200 }).catch(() => null),
    listCamporeeEventTemplateGeography(territoryScope),
  ]);

  const item = toTemplateRecord(templateRes);
  if (!item) notFound();

  const eventTypes = etRes ? buildEventTypeOptions(etRes) : [];
  const unions = buildUnionOptions(geography.unions);
  const localFields = buildLocalFieldOptions(geography.localFields);
  const classes = buildClassOptions(classesRes);

  return (
    <EventTemplateFormPage
      mode="edit"
      item={item}
      allowedScopes={allowedScopes}
      eventTypes={eventTypes}
      unions={unions}
      localFields={localFields}
      classes={classes}
      action={updateCamporeeEventTemplateAction}
    />
  );
}
