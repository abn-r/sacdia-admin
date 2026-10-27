import { notFound, redirect } from "next/navigation";
import type { AuthUser } from "@/lib/auth/types";
import { canCapability } from "@/lib/auth/screen-catalog";
import { resolveAdminTerritoryScope, type AdminTerritoryScope } from "@/lib/auth/territory-scope";
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
import { listClasses, type ProgressiveClass } from "@/lib/api/classes";
import {
  createCamporeeEventTemplateAction,
  updateCamporeeEventTemplateAction,
} from "@/lib/camporee-events/actions";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type {
  AllowedTemplateScope,
  EventTemplateFormPageProps,
  EventTypeOption,
  LocalFieldOption,
  UnionOption,
} from "@/components/camporee-events/event-template-form-page";

export const EVENT_TEMPLATES_LIST_HREF = "/dashboard/campamentos/plantillas";

/**
 * Discriminated so callers keep the original gating: no capability →
 * redirect to the template list, bad id / missing template → 404.
 */
export type EventTemplateFormDataResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "ok"; props: EventTemplateFormPageProps };

/** Applies the gate (redirect / 404) and returns the form props. */
export function resolveEventTemplateFormData(
  result: EventTemplateFormDataResult,
): EventTemplateFormPageProps {
  if (result.status === "forbidden") redirect(EVENT_TEMPLATES_LIST_HREF);
  if (result.status === "not-found") notFound();
  return result.props;
}

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

function buildOptions(
  payload: unknown,
  idKey: "event_type_id" | "union_id" | "local_field_id",
): { value: number; label: string }[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const rawId = item[idKey];
      const id = typeof rawId === "number" ? rawId : Number(rawId);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is { value: number; label: string } => x !== null);
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

/**
 * Props for `EventTemplateFormPage` (create), shared by the full page and the
 * intercepted modal.
 */
export async function loadCreateEventTemplateFormData(
  user: AuthUser,
): Promise<EventTemplateFormDataResult> {
  if (!canCapability(user, "campamentos-plantillas", "create")) {
    return { status: "forbidden" };
  }

  const territoryScope = resolveAdminTerritoryScope(user);
  const allowedScopes = buildScopeAllowedScopes(territoryScope);

  const [etRes, classesRes, geography] = await Promise.all([
    listAdminCamporeeEventTypes({ active: true, limit: 200 }).catch(() => null),
    listClasses({ limit: 200 }).catch(() => null),
    listCamporeeEventTemplateGeography(territoryScope),
  ]);

  return {
    status: "ok",
    props: {
      mode: "create",
      allowedScopes,
      eventTypes: etRes ? (buildOptions(etRes, "event_type_id") as EventTypeOption[]) : [],
      unions: buildOptions(geography.unions, "union_id") as UnionOption[],
      localFields: buildOptions(geography.localFields, "local_field_id") as LocalFieldOption[],
      classes: buildClassOptions(classesRes),
      action: createCamporeeEventTemplateAction,
    },
  };
}

/**
 * Props for `EventTemplateFormPage` (edit), shared by the full page and the
 * intercepted modal.
 */
export async function loadEditEventTemplateFormData(
  user: AuthUser,
  idParam: string,
): Promise<EventTemplateFormDataResult> {
  if (!canCapability(user, "campamentos-plantillas", "update")) {
    return { status: "forbidden" };
  }

  const territoryScope = resolveAdminTerritoryScope(user);
  const allowedScopes = buildScopeAllowedScopes(territoryScope);
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) return { status: "not-found" };

  const [templateRes, etRes, classesRes, geography] = await Promise.all([
    getCamporeeEventTemplate(numericId).catch(() => null),
    listAdminCamporeeEventTypes({ active: true, limit: 200 }).catch(() => null),
    listClasses({ limit: 200 }).catch(() => null),
    listCamporeeEventTemplateGeography(territoryScope),
  ]);

  const item = toTemplateRecord(templateRes);
  if (!item) return { status: "not-found" };

  return {
    status: "ok",
    props: {
      mode: "edit",
      item,
      allowedScopes,
      eventTypes: etRes ? (buildOptions(etRes, "event_type_id") as EventTypeOption[]) : [],
      unions: buildOptions(geography.unions, "union_id") as UnionOption[],
      localFields: buildOptions(geography.localFields, "local_field_id") as LocalFieldOption[],
      classes: buildClassOptions(classesRes),
      action: updateCamporeeEventTemplateAction,
    },
  };
}
