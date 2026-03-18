import { HonorCategoriesCrudPage } from "@/components/catalogs/honor-categories-crud-page";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError } from "@/lib/api/client";
import {
  listHonorCategoriesAdmin,
  type HonorCategoryListQuery,
} from "@/lib/api/honor-categories";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  HONOR_CATEGORIES_CREATE,
  HONOR_CATEGORIES_DELETE,
  HONOR_CATEGORIES_READ,
  HONOR_CATEGORIES_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  createHonorCategoryAction,
  deleteHonorCategoryAction,
  updateHonorCategoryAction,
} from "@/lib/honor-categories/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type GenericRecord = Record<string, unknown>;

type HonorCategoriesMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const HONOR_CATEGORIES_FILTER_FETCH_LIMIT = 500;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function toRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as GenericRecord;
}

function readParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === "string");
  }
  return undefined;
}

function readPositiveNumberParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): number | undefined {
  const value = readParam(raw, key);
  if (!value) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): HonorCategoryListQuery {
  const activeRaw = readParam(raw, "active");
  const searchRaw =
    readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;

  const query: HonorCategoryListQuery = {
    search: toNonEmptyString(searchRaw) ?? undefined,
    page,
    limit,
  };

  if (activeRaw === "true") query.active = true;
  if (activeRaw === "false") query.active = false;

  return query;
}

function extractItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];

  const root = toRecord(payload);
  if (!root) return [];

  if (Array.isArray(root.data)) return root.data as GenericRecord[];

  const nestedData = toRecord(root.data);
  if (nestedData && Array.isArray(nestedData.data)) {
    return nestedData.data as GenericRecord[];
  }

  return [];
}

function extractMeta(
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackTotal: number,
): HonorCategoriesMeta {
  const root = toRecord(payload);
  const nestedData = toRecord(root?.data);
  const metaRecord = toRecord(nestedData?.meta) ?? toRecord(root?.meta);

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

  return {
    page,
    limit,
    total,
    totalPages,
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function applyLocalFilters(
  items: GenericRecord[],
  query: HonorCategoryListQuery,
): GenericRecord[] {
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const normalizedSearch = search ? normalizeSearchText(search) : "";
  const active = query.active;

  if (!normalizedSearch && typeof active !== "boolean") {
    return items;
  }

  return items.filter((item) => {
    if (normalizedSearch) {
      const name =
        toNonEmptyString(item.name) ?? toNonEmptyString(item.title) ?? "";
      if (!normalizeSearchText(name).includes(normalizedSearch)) {
        return false;
      }
    }

    if (typeof active === "boolean") {
      const itemActive = toBoolean(item.active);
      const normalizedActive = itemActive === null ? true : itemActive;
      if (normalizedActive !== active) {
        return false;
      }
    }

    return true;
  });
}

function paginateItems(
  items: GenericRecord[],
  page: number,
  limit: number,
): { pagedItems: GenericRecord[]; meta: HonorCategoriesMeta } {
  const safeLimit = Math.max(1, limit);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;

  return {
    pagedItems: items.slice(start, end),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function listAllHonorCategoriesForFiltering(): Promise<GenericRecord[]> {
  const payload = await listHonorCategoriesAdmin({
    page: 1,
    limit: HONOR_CATEGORIES_FILTER_FETCH_LIMIT,
  });
  return extractItems(payload);
}

export default async function HonorCategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const canRead = hasAnyPermission(user, [HONOR_CATEGORIES_READ]);

  if (!canRead) {
    return (
      <EndpointErrorBanner
        state="forbidden"
        detail="No cuentas con permisos para ver categorías de especialidades."
      />
    );
  }

  const rawSearchParams = await searchParams;
  const query = parseSearchParams(rawSearchParams);

  let items: GenericRecord[] = [];
  let meta: HonorCategoriesMeta = {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    total: 0,
    totalPages: 1,
  };
  let loadError: string | null = null;

  try {
    const hasAnyFilter = Boolean(
      query.search || typeof query.active === "boolean",
    );

    if (hasAnyFilter) {
      const fetchedItems = await listAllHonorCategoriesForFiltering();
      const filteredItems = applyLocalFilters(fetchedItems, query);
      const paginated = paginateItems(
        filteredItems,
        query.page ?? 1,
        query.limit ?? 20,
      );

      items = paginated.pagedItems;
      meta = paginated.meta;
    } else {
      const payload = await listHonorCategoriesAdmin(query);
      items = extractItems(payload);
      meta = extractMeta(
        payload,
        query.page ?? 1,
        query.limit ?? 20,
        items.length,
      );
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      items = [];
      meta = {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total: 0,
        totalPages: 1,
      };
    } else {
      loadError =
        error instanceof ApiError
          ? error.message
          : "No se pudieron cargar las categorías de especialidades.";
    }
  }

  const canCreate = hasAnyPermission(user, [HONOR_CATEGORIES_CREATE]);
  const canEdit = hasAnyPermission(user, [HONOR_CATEGORIES_UPDATE]);
  const canDelete = hasAnyPermission(user, [HONOR_CATEGORIES_DELETE]);

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      <HonorCategoriesCrudPage
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createHonorCategoryAction}
        updateAction={updateHonorCategoryAction}
        deleteAction={deleteHonorCategoryAction}
      />
    </div>
  );
}
