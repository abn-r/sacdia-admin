import { listClubTypes } from "@/lib/api/catalogs";
import { listHonorCategories } from "@/lib/api/honors";

export type SelectOption = { label: string; value: number };
type GenericRecord = Record<string, unknown>;

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

function normalizeArrayPayload(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
    return ((payload as { data: unknown[] }).data).filter(
      (item): item is GenericRecord => Boolean(item) && typeof item === "object",
    );
  }
  return [];
}

export async function getHonorCategoriesPayload() {
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

export async function getClubTypesPayload() {
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

export function buildCategoryOptions(payload: unknown): SelectOption[] {
  const options: SelectOption[] = [];
  for (const category of normalizeArrayPayload(payload)) {
    const id = toPositiveNumber(category.honor_category_id ?? category.category_id);
    const name = toNonEmptyString(category.name);
    if (id && name) {
      options.push({ value: id, label: name });
    }
  }
  return options;
}

export function buildClubTypeOptions(payload: unknown): SelectOption[] {
  const options: SelectOption[] = [];
  for (const clubType of normalizeArrayPayload(payload)) {
    const id = toPositiveNumber(clubType.club_type_id);
    const name = toNonEmptyString(clubType.name);
    if (id && name) {
      options.push({ value: id, label: name });
    }
  }
  return options;
}

export async function loadHonorCatalogOptions(): Promise<{
  categoryOptions: SelectOption[];
  clubTypeOptions: SelectOption[];
}> {
  const [categoriesPayload, clubTypesPayload] = await Promise.all([
    getHonorCategoriesPayload(),
    getClubTypesPayload(),
  ]);

  return {
    categoryOptions: buildCategoryOptions(categoriesPayload),
    clubTypeOptions: buildClubTypeOptions(clubTypesPayload),
  };
}
