import { ResourcesCrudPage } from "@/components/resources/resources-crud-page";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError } from "@/lib/api/client";
import { listResources, listResourceCategories } from "@/lib/api/resources";
import type { ResourceType, ClubTypeTarget, ScopeLevel } from "@/lib/api/resources";
import { listUnions, listLocalFields } from "@/lib/api/geography";
import type { Union, LocalField } from "@/lib/api/geography";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  RESOURCES_CREATE,
  RESOURCES_DELETE,
  RESOURCES_READ,
  RESOURCES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  createResourceAction,
  deleteResourceAction,
  updateResourceAction,
} from "@/lib/resources/resource-actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type GenericRecord = Record<string, unknown>;
type CategoryRecord = { resource_category_id: number; name: string };

type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const VALID_RESOURCE_TYPES: ResourceType[] = ["document", "audio", "image", "video_link", "text"];
const VALID_CLUB_TYPES: ClubTypeTarget[] = ["all", "Aventureros", "Conquistadores", "Guías Mayores"];
const VALID_SCOPE_LEVELS: ScopeLevel[] = ["system", "union", "local_field"];

function readParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find((e) => typeof e === "string");
  return undefined;
}

function readPositiveNumber(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): number | undefined {
  const value = readParam(raw, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as GenericRecord;
}

function extractItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  const root = toRecord(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data as GenericRecord[];
  const nestedData = toRecord(root.data);
  if (nestedData && Array.isArray(nestedData.data)) return nestedData.data as GenericRecord[];
  if (nestedData && Array.isArray(nestedData.items)) return nestedData.items as GenericRecord[];
  return [];
}

function extractMeta(
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackTotal: number,
): PageMeta {
  const root = toRecord(payload);
  const nestedData = toRecord(root?.data);
  const metaRecord = toRecord(nestedData?.meta) ?? toRecord(root?.meta) ?? nestedData;

  const page = toPositiveNumber(metaRecord?.page) ?? fallbackPage;
  const limit = toPositiveNumber(metaRecord?.limit) ?? fallbackLimit;
  const total =
    toPositiveNumber(metaRecord?.total) ??
    toPositiveNumber(metaRecord?.count) ??
    fallbackTotal;
  const totalPages =
    toPositiveNumber(metaRecord?.totalPages) ??
    toPositiveNumber(metaRecord?.total_pages) ??
    Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { page, limit, total, totalPages };
}

function extractCategories(payload: unknown): CategoryRecord[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id = toPositiveNumber(item.resource_category_id ?? item.category_id ?? item.id);
      const name =
        typeof item.name === "string" ? item.name.trim() : null;
      if (!id || !name) return null;
      return { resource_category_id: id, name } satisfies CategoryRecord;
    })
    .filter((c): c is CategoryRecord => c !== null);
}

function extractUnions(payload: unknown): Union[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id = toPositiveNumber(item.union_id ?? item.id);
      const name = typeof item.name === "string" ? item.name.trim() : null;
      if (!id || !name) return null;
      return { union_id: id, name, country_id: Number(item.country_id ?? 0), active: item.active as boolean | undefined } satisfies Union;
    })
    .filter((u): u is Union => u !== null)
    .filter((u) => u.active !== false);
}

function extractLocalFields(payload: unknown): LocalField[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id = toPositiveNumber(item.local_field_id ?? item.id);
      const name = typeof item.name === "string" ? item.name.trim() : null;
      if (!id || !name) return null;
      return { local_field_id: id, name, union_id: Number(item.union_id ?? 0), active: item.active as boolean | undefined } satisfies LocalField;
    })
    .filter((lf): lf is LocalField => lf !== null && lf.active !== false);
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();

  if (!hasAnyPermission(user, [RESOURCES_READ])) {
    return (
      <EndpointErrorBanner
        state="forbidden"
        detail="No cuentas con permisos para ver recursos."
      />
    );
  }

  const raw = await searchParams;
  const page = readPositiveNumber(raw, "page") ?? 1;
  const limit = readPositiveNumber(raw, "limit") ?? 20;

  const rawType = readParam(raw, "resource_type");
  const resourceType = rawType && VALID_RESOURCE_TYPES.includes(rawType as ResourceType)
    ? (rawType as ResourceType)
    : undefined;

  const rawClubType = readParam(raw, "club_type");
  const clubType = rawClubType && VALID_CLUB_TYPES.includes(rawClubType as ClubTypeTarget)
    ? (rawClubType as ClubTypeTarget)
    : undefined;

  const rawScopeLevel = readParam(raw, "scope_level");
  const scopeLevel = rawScopeLevel && VALID_SCOPE_LEVELS.includes(rawScopeLevel as ScopeLevel)
    ? (rawScopeLevel as ScopeLevel)
    : undefined;

  const categoryId = readPositiveNumber(raw, "category_id");
  const search = readParam(raw, "search");

  let items: GenericRecord[] = [];
  let meta: PageMeta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;
  let categories: CategoryRecord[] = [];
  let unions: Union[] = [];
  let localFields: LocalField[] = [];

  // Fetch all data in parallel
  const [resourcesResult, categoriesResult, unionsResult, localFieldsResult] =
    await Promise.allSettled([
      listResources({ page, limit, resource_type: resourceType, category_id: categoryId, club_type: clubType, scope_level: scopeLevel, search }),
      listResourceCategories({ limit: 500 }),
      listUnions(),
      listLocalFields(),
    ]);

  if (resourcesResult.status === "fulfilled") {
    items = extractItems(resourcesResult.value);
    meta = extractMeta(resourcesResult.value, page, limit, items.length);
  } else {
    const error = resourcesResult.reason;
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError =
        error instanceof ApiError
          ? error.message
          : "No se pudieron cargar los recursos.";
    }
  }

  if (categoriesResult.status === "fulfilled") {
    categories = extractCategories(categoriesResult.value);
  }

  if (unionsResult.status === "fulfilled") {
    unions = extractUnions(unionsResult.value);
  }

  if (localFieldsResult.status === "fulfilled") {
    localFields = extractLocalFields(localFieldsResult.value);
  }

  const canCreate = hasAnyPermission(user, [RESOURCES_CREATE]);
  const canEdit = hasAnyPermission(user, [RESOURCES_UPDATE]);
  const canDelete = hasAnyPermission(user, [RESOURCES_DELETE]);

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      <ResourcesCrudPage
        items={items}
        meta={meta}
        categories={categories}
        unions={unions}
        localFields={localFields}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createResourceAction}
        updateAction={updateResourceAction}
        deleteAction={deleteResourceAction}
      />
    </div>
  );
}
