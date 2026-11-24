import { listResourceCategories, type ScopeLevel } from "@/lib/api/resources";
import { listClubTypes, type ClubType } from "@/lib/api/catalogs";
import type { LocalField, Union } from "@/lib/api/geography";
import {
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
} from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";
import { resolveResourceScopeOptions } from "@/lib/resources/scope-options";
import { errorStateFromError } from "@/lib/api/error-state";
import type {
  CategoryOption,
  ResourcesLoadFailure,
} from "@/components/resources/resource-meta";

type GenericRecord = Record<string, unknown>;

export const DEFAULT_CLUB_TYPES: ClubType[] = [
  { club_type_id: 1, name: "Aventureros" },
  { club_type_id: 2, name: "Conquistadores" },
  { club_type_id: 3, name: "Guías Mayores" },
];

export type ResourceFormData = {
  categories: CategoryOption[];
  /** The categories request failed: the form says so instead of offering "no category". */
  categoriesFailed: boolean;
  /** Every category the API returned, active or not (the Categories tab lists and counts these). */
  categoryRecords: GenericRecord[];
  /** Why the categories request failed, shaped for `ErrorState`. */
  categoriesFailure: ResourcesLoadFailure | null;
  clubTypes: ClubType[];
  unions: Union[];
  localFields: LocalField[];
  allowedScopeLevels: ScopeLevel[];
  lockedScopeId: number | null;
};

/** Failed request -> serializable `ErrorState` props (the `at` Date becomes an ISO string). */
export function toLoadFailure(error: unknown): ResourcesLoadFailure {
  const state = errorStateFromError(error);
  const at = state.detail?.at;
  return {
    kind: state.kind,
    ...(state.detail
      ? {
          detail: {
            ...(state.detail.code !== undefined ? { code: state.detail.code } : {}),
            ...(at !== undefined ? { at: new Date(at).toISOString() } : {}),
          },
        }
      : {}),
  };
}

export function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as GenericRecord;
}

export function extractItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  const root = toRecord(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data as GenericRecord[];
  const nestedData = toRecord(root.data);
  if (nestedData && Array.isArray(nestedData.data)) return nestedData.data as GenericRecord[];
  if (nestedData && Array.isArray(nestedData.items)) return nestedData.items as GenericRecord[];
  return [];
}

function extractCategories(items: GenericRecord[]): CategoryOption[] {
  return items.flatMap((item) => {
    if (item.active === false) return [];
    const id = toPositiveNumber(item.resource_category_id ?? item.category_id ?? item.id);
    const name = typeof item.name === "string" ? item.name.trim() : null;
    return id && name ? [{ resource_category_id: id, name }] : [];
  });
}

function extractClubTypes(payload: unknown): ClubType[] {
  return extractItems(payload).flatMap((item) => {
    const id = toPositiveNumber(item.club_type_id ?? item.id);
    const name = typeof item.name === "string" ? item.name.trim() : null;
    return id && name ? [{ club_type_id: id, name }] : [];
  });
}

function extractUnions(payload: unknown): Union[] {
  return extractItems(payload).flatMap((item) => {
    const id = toPositiveNumber(item.union_id ?? item.id);
    const name = typeof item.name === "string" ? item.name.trim() : null;
    if (!id || !name || item.active === false) return [];
    return [
      {
        union_id: id,
        name,
        country_id: Number(item.country_id ?? 0),
        active: item.active as boolean | undefined,
      },
    ];
  });
}

function extractLocalFields(payload: unknown): LocalField[] {
  return extractItems(payload).flatMap((item) => {
    const id = toPositiveNumber(item.local_field_id ?? item.id);
    const name = typeof item.name === "string" ? item.name.trim() : null;
    if (!id || !name || item.active === false) return [];
    return [
      {
        local_field_id: id,
        name,
        union_id: Number(item.union_id ?? 0),
        active: item.active as boolean | undefined,
      },
    ];
  });
}

/**
 * Catalogs shared by the library list (filters, edit) and the upload modal.
 * Both routes call it so the direct load and the intercepted route offer the
 * same options. Categories and territory lists degrade on their own: a failed
 * request never turns the whole screen into an empty one.
 */
export async function loadResourceFormData(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): Promise<ResourceFormData> {
  const [categoriesResult, clubTypesResult, unionsResult, localFieldsResult] =
    await Promise.allSettled([
      listResourceCategories({ includeInactive: true }),
      listClubTypes(),
      listUnionsForTerritory(user),
      listLocalFieldsForTerritory(user),
    ]);

  const categoryItems =
    categoriesResult.status === "fulfilled" ? extractItems(categoriesResult.value) : [];
  const categories = extractCategories(categoryItems);

  const clubTypes =
    clubTypesResult.status === "fulfilled" ? extractClubTypes(clubTypesResult.value) : [];

  const unions =
    unionsResult.status === "fulfilled"
      ? Array.isArray(unionsResult.value)
        ? unionsResult.value
        : extractUnions(unionsResult.value)
      : [];

  const localFields =
    localFieldsResult.status === "fulfilled"
      ? Array.isArray(localFieldsResult.value)
        ? localFieldsResult.value
        : extractLocalFields(localFieldsResult.value)
      : [];

  // The role's territory limits which levels and which territory it may target.
  const { allowedScopeLevels, lockedScopeId } = resolveResourceScopeOptions(user);
  let scopedUnions = unions;
  let scopedLocalFields = localFields;

  if (allowedScopeLevels.length === 1 && lockedScopeId !== null) {
    if (allowedScopeLevels[0] === "union") {
      scopedUnions = unions.filter((u) => u.union_id === lockedScopeId);
      scopedLocalFields = [];
    } else if (allowedScopeLevels[0] === "local_field") {
      scopedUnions = [];
      scopedLocalFields = localFields.filter((lf) => lf.local_field_id === lockedScopeId);
    }
  } else if (allowedScopeLevels.length === 0) {
    scopedUnions = [];
    scopedLocalFields = [];
  }

  return {
    categories,
    categoriesFailed: categoriesResult.status === "rejected",
    categoryRecords: categoryItems,
    categoriesFailure:
      categoriesResult.status === "rejected" ? toLoadFailure(categoriesResult.reason) : null,
    clubTypes: clubTypes.length > 0 ? clubTypes : DEFAULT_CLUB_TYPES,
    unions: scopedUnions,
    localFields: scopedLocalFields,
    allowedScopeLevels,
    lockedScopeId,
  };
}
