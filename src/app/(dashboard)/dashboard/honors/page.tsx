import { ApiError } from "@/lib/api/client";
import { listClubTypes } from "@/lib/api/catalogs";
import { listHonorCategories, listHonors, type HonorListQuery } from "@/lib/api/honors";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { HONORS_CREATE, HONORS_UPDATE } from "@/lib/auth/permissions";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { HonorsCrudPage } from "@/components/honors/honors-crud-page";
import {
  createHonorAction,
  deactivateHonorAction,
  updateHonorAction,
} from "@/lib/honors/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type SelectOption = { label: string; value: number };
type GenericRecord = Record<string, unknown>;

type HonorsListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const HONORS_FILTER_FETCH_LIMIT = 100;
const CATALOGS_CACHE_TTL_MS = 5 * 60 * 1000;
const EMPTY_ARRAY: unknown[] = [];

let cachedHonorCategories: { value: unknown; fetchedAt: number } | null = null;
let cachedClubTypes: { value: unknown; fetchedAt: number } | null = null;

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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function readParam(raw: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = raw[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === "string");
  }
  return undefined;
}

function readPositiveNumberParam(raw: Record<string, string | string[] | undefined>, key: string): number | undefined {
  const value = readParam(raw, key);
  if (!value) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function parseSearchParams(raw: Record<string, string | string[] | undefined>): HonorListQuery {
  const activeRaw = readParam(raw, "active");
  const searchRaw =
    readParam(raw, "search") ??
    readParam(raw, "name") ??
    readParam(raw, "q");
  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const categoryId =
    readPositiveNumberParam(raw, "categoryId") ??
    readPositiveNumberParam(raw, "honors_category_id");
  const clubTypeId =
    readPositiveNumberParam(raw, "clubTypeId") ??
    readPositiveNumberParam(raw, "club_type_id");
  const skillLevel =
    readPositiveNumberParam(raw, "skillLevel") ??
    readPositiveNumberParam(raw, "skill_level");

  const query: HonorListQuery = {
    search: toNonEmptyString(searchRaw) ?? undefined,
    page,
    limit,
  };

  if (activeRaw === "true") query.active = true;
  if (activeRaw === "false") query.active = false;
  if (categoryId) {
    query.categoryId = categoryId;
    query.honors_category_id = categoryId;
  }
  if (clubTypeId) {
    query.clubTypeId = clubTypeId;
    query.club_type_id = clubTypeId;
  }
  if (skillLevel) {
    query.skillLevel = skillLevel;
    query.skill_level = skillLevel;
  }

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
): HonorsListMeta {
  const root = toRecord(payload);
  const nestedData = toRecord(root?.data);
  const metaRecord =
    toRecord(nestedData?.meta) ??
    toRecord(root?.meta);

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

function applyLocalFilters(items: GenericRecord[], query: HonorListQuery): GenericRecord[] {
  const search = typeof query.search === "string" ? query.search.trim() : "";
  const normalizedSearch = search ? normalizeSearchText(search) : "";
  const categoryId = query.categoryId ?? query.honors_category_id;
  const clubTypeId = query.clubTypeId ?? query.club_type_id;
  const skillLevel = query.skillLevel ?? query.skill_level;
  const active = query.active;

  if (!normalizedSearch && !categoryId && !clubTypeId && !skillLevel && typeof active !== "boolean") {
    return items;
  }

  return items.filter((item) => {
    if (normalizedSearch) {
      const searchableName = toNonEmptyString(item.name) ?? toNonEmptyString(item.title) ?? "";
      if (!normalizeSearchText(searchableName).includes(normalizedSearch)) {
        return false;
      }
    }

    if (categoryId) {
      const itemCategoryId =
        toPositiveNumber(item.honors_category_id) ??
        toPositiveNumber(item.honor_category_id) ??
        toPositiveNumber(item.category_id);
      if (itemCategoryId !== categoryId) {
        return false;
      }
    }

    if (clubTypeId) {
      const itemClubTypeId = toPositiveNumber(item.club_type_id);
      if (itemClubTypeId !== clubTypeId) {
        return false;
      }
    }

    if (skillLevel) {
      const itemSkillLevel = toPositiveNumber(item.skill_level);
      if (itemSkillLevel !== skillLevel) {
        return false;
      }
    }

    if (typeof active === "boolean") {
      // Preserve existing semantics: undefined/null is treated as active in the UI.
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
): { pagedItems: GenericRecord[]; meta: HonorsListMeta } {
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

async function listAllHonorsForFiltering(): Promise<GenericRecord[]> {
  const payload = await listHonors({
    page: 1,
    limit: HONORS_FILTER_FETCH_LIMIT,
  });
  return extractItems(payload);
}

async function getCachedHonorCategoriesPayload() {
  const now = Date.now();
  if (cachedHonorCategories && now - cachedHonorCategories.fetchedAt < CATALOGS_CACHE_TTL_MS) {
    return cachedHonorCategories.value;
  }

  try {
    const payload = await listHonorCategories();
    cachedHonorCategories = { value: payload, fetchedAt: now };
    return payload;
  } catch {
    if (cachedHonorCategories) {
      return cachedHonorCategories.value;
    }
    return EMPTY_ARRAY;
  }
}

async function getCachedClubTypesPayload() {
  const now = Date.now();
  if (cachedClubTypes && now - cachedClubTypes.fetchedAt < CATALOGS_CACHE_TTL_MS) {
    return cachedClubTypes.value;
  }

  try {
    const payload = await listClubTypes();
    cachedClubTypes = { value: payload, fetchedAt: now };
    return payload;
  } catch {
    if (cachedClubTypes) {
      return cachedClubTypes.value;
    }
    return EMPTY_ARRAY;
  }
}

function normalizeCategories(payload: unknown): Array<GenericRecord> {
  if (Array.isArray(payload)) return payload as Array<GenericRecord>;
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
    return ((payload as { data: unknown[] }).data).filter(
      (item): item is GenericRecord => Boolean(item) && typeof item === "object",
    );
  }
  return [];
}

function normalizeClubTypes(payload: unknown): Array<GenericRecord> {
  if (Array.isArray(payload)) return payload as Array<GenericRecord>;
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
    return ((payload as { data: unknown[] }).data).filter(
      (item): item is GenericRecord => Boolean(item) && typeof item === "object",
    );
  }
  return [];
}

export default async function HonorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const roleSet = new Set(extractRoles(user));
  const isSuperAdmin = roleSet.has(SUPER_ADMIN_ROLE);

  const rawSearchParams = await searchParams;
  const query = parseSearchParams(rawSearchParams);

  let honors: GenericRecord[] = [];
  let meta: HonorsListMeta = {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    total: 0,
    totalPages: 1,
  };
  let loadError: string | null = null;

  try {
    const hasAnyFilter = Boolean(
      query.search ||
      typeof query.active === "boolean" ||
      query.categoryId ||
      query.honors_category_id ||
      query.clubTypeId ||
      query.club_type_id ||
      query.skillLevel ||
      query.skill_level,
    );

    if (hasAnyFilter) {
      // Avoid throttling storms: one request only, then filter in memory.
      const fetchedHonors = await listAllHonorsForFiltering();
      const filteredHonors = applyLocalFilters(fetchedHonors, query);
      const paginated = paginateItems(
        filteredHonors,
        query.page ?? 1,
        query.limit ?? 20,
      );

      honors = paginated.pagedItems;
      meta = paginated.meta;
    } else {
      const payload = await listHonors(query);
      honors = extractItems(payload);
      meta = extractMeta(payload, query.page ?? 1, query.limit ?? 20, honors.length);
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      // If backend rate-limits temporarily, show empty filtered state without hard-failing the page.
      honors = [];
      meta = {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total: 0,
        totalPages: 1,
      };
    } else {
      loadError = error instanceof ApiError ? error.message : "No se pudieron cargar las especialidades.";
    }
  }

  const [categoriesPayload, clubTypesPayload] = await Promise.all([
    getCachedHonorCategoriesPayload(),
    getCachedClubTypesPayload(),
  ]);

  const categoryOptions: SelectOption[] = [];
  const categories = normalizeCategories(categoriesPayload);
  for (const category of categories) {
    const id = toPositiveNumber(category.honor_category_id ?? category.category_id);
    const name = toNonEmptyString(category.name);
    if (id && name) {
      categoryOptions.push({ value: id, label: name });
    }
  }

  const clubTypeOptions: SelectOption[] = [];
  const clubTypes = normalizeClubTypes(clubTypesPayload);
  for (const clubType of clubTypes) {
    const id = toPositiveNumber(clubType.club_type_id);
    const name = toNonEmptyString(clubType.name);
    if (id && name) {
      clubTypeOptions.push({ value: id, label: name });
    }
  }

  const canCreate = isSuperAdmin || hasAnyPermission(user, [HONORS_CREATE]);
  const canEdit = isSuperAdmin || hasAnyPermission(user, [HONORS_UPDATE]);
  const canDelete = isSuperAdmin;

  return (
    <div className="space-y-6">
      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      <HonorsCrudPage
        items={honors}
        meta={meta}
        categoryOptions={categoryOptions}
        clubTypeOptions={clubTypeOptions}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createHonorAction}
        updateActionBase={updateHonorAction}
        deactivateAction={deactivateHonorAction}
      />
    </div>
  );
}
