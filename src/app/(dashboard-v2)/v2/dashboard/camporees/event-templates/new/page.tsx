import type { Metadata } from "next";
import { panelRedirect } from "@/lib/v2/panel-path-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREES_CREATE,
} from "@/lib/auth/permissions";
import { resolveAdminTerritoryScope, type AdminTerritoryScope } from "@/lib/auth/territory-scope";
import {
  listAdminCamporeeEventTypes,
  listAdminLocalFields,
  listAdminUnions,
} from "@/lib/api/generic-catalogs-i18n";
import { listClasses } from "@/lib/api/classes";
import { createCamporeeEventTemplateAction } from "@/lib/camporee-events/actions";
import {
  EventTemplateFormPage,
  type AllowedTemplateScope,
  type EventTypeOption,
  type LocalFieldOption,
  type UnionOption,
} from "@/components/camporee-events/event-template-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { ProgressiveClass } from "@/lib/api/classes";

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

function buildScopeAllowedScopes(scope: AdminTerritoryScope): AllowedTemplateScope[] {
  if (scope.level === "local_field") {
    return ["local_field"];
  }

  return ["union", "local_field"];
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

export default async function EventTemplateNewPage() {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE]);
  if (!canCreate) {
    panelRedirect("/dashboard/camporees/event-templates");
  }

  const territoryScope = resolveAdminTerritoryScope(user);
  const allowedScopes = buildScopeAllowedScopes(territoryScope);

  const [etRes, classesRes, geography] = await Promise.all([
    listAdminCamporeeEventTypes({ active: true, limit: 200 }).catch(() => null),
    listClasses({ limit: 200 }).catch(() => null),
    listCamporeeEventTemplateGeography(territoryScope),
  ]);

  const eventTypes = etRes ? buildEventTypeOptions(etRes) : [];
  const unions = buildUnionOptions(geography.unions);
  const localFields = buildLocalFieldOptions(geography.localFields);

  const classes = buildClassOptions(classesRes);

  return (
    <EventTemplateFormPage
      mode="create"
      allowedScopes={allowedScopes}
      eventTypes={eventTypes}
      unions={unions}
      localFields={localFields}
      classes={classes}
      action={createCamporeeEventTemplateAction}
    />
  );
}
