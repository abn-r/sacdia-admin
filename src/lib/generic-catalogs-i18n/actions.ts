"use server";

/**
 * Generic Catalogs i18n — server actions for 12 catalog targets:
 *
 * Geography (name-only): countries, unions, local-fields, districts, churches
 * Reference (name + description): relationship-types, allergies, diseases,
 *   medicines, activity-types
 * Reference (name-only): club-types
 * Special (name + ideal): club-ideals
 *
 * Pattern mirrors phase-e-catalogs/actions.ts exactly.
 * Extension: makeActions accepts an optional `translatableFields` parameter
 * that controls which fields are extracted from form translations.
 * club-ideals registers with translatableFields: ['name', 'ideal'].
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionErrorMessage } from "@/lib/api/action-error";
import {
  CATALOG_LOCALES,
  type CatalogTranslation,
} from "@/lib/types/catalog-translation";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_UPDATE,
  CATALOGS_DELETE,
  COUNTRIES_CREATE,
  COUNTRIES_UPDATE,
  COUNTRIES_DELETE,
  UNIONS_CREATE,
  UNIONS_UPDATE,
  UNIONS_DELETE,
  LOCAL_FIELDS_CREATE,
  LOCAL_FIELDS_UPDATE,
  LOCAL_FIELDS_DELETE,
  DISTRICTS_CREATE,
  DISTRICTS_UPDATE,
  DISTRICTS_DELETE,
  CHURCHES_CREATE,
  CHURCHES_UPDATE,
  CHURCHES_DELETE,
  RELATIONSHIP_TYPES_CREATE,
  RELATIONSHIP_TYPES_UPDATE,
  RELATIONSHIP_TYPES_DELETE,
  ALLERGIES_CREATE,
  ALLERGIES_UPDATE,
  ALLERGIES_DELETE,
  DISEASES_CREATE,
  DISEASES_UPDATE,
  DISEASES_DELETE,
  MEDICINES_CREATE,
  MEDICINES_UPDATE,
  MEDICINES_DELETE,
  CLUB_TYPES_CREATE,
  CLUB_TYPES_UPDATE,
  CLUB_TYPES_DELETE,
  CLUB_IDEALS_CREATE,
  CLUB_IDEALS_UPDATE,
  CLUB_IDEALS_DELETE,
  ACTIVITY_TYPES_CREATE,
  ACTIVITY_TYPES_UPDATE,
  ACTIVITY_TYPES_DELETE,
} from "@/lib/auth/permissions";
import {
  createAdminCountry,
  updateAdminCountry,
  deleteAdminCountry,
  createAdminUnion,
  updateAdminUnion,
  deleteAdminUnion,
  createAdminLocalField,
  updateAdminLocalField,
  deleteAdminLocalField,
  createAdminDistrict,
  updateAdminDistrict,
  deleteAdminDistrict,
  createAdminChurch,
  updateAdminChurch,
  deleteAdminChurch,
  createAdminRelationshipType,
  updateAdminRelationshipType,
  deleteAdminRelationshipType,
  createAdminAllergy,
  updateAdminAllergy,
  deleteAdminAllergy,
  createAdminDisease,
  updateAdminDisease,
  deleteAdminDisease,
  createAdminMedicine,
  updateAdminMedicine,
  deleteAdminMedicine,
  createAdminClubType,
  updateAdminClubType,
  deleteAdminClubType,
  createAdminClubIdeal,
  updateAdminClubIdeal,
  deleteAdminClubIdeal,
  createAdminActivityType,
  updateAdminActivityType,
  deleteAdminActivityType,
} from "@/lib/api/generic-catalogs-i18n";

// ─── Shared types ──────────────────────────────────────────────────────────────

export type GenericCatalogActionState = { error?: string };

/** The set of field names that can appear in a per-locale translation entry. */
type TranslatableField = "name" | "description" | "ideal";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function readString(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function parseBool(formData: FormData, field: string): boolean {
  return formData.get(field) === "on" || formData.get(field) === "true";
}

function parsePositiveInt(formData: FormData, field: string): number | null {
  const raw = readString(formData, field);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

/**
 * Parses `translations[N][locale]` / `translations[N][name]` /
 * `translations[N][description]` / `translations[N][ideal]` entries from
 * FormData into a CatalogTranslation array.
 *
 * Only the fields listed in `fields` are extracted per entry.
 * Entries where all translatable fields are empty are skipped.
 * Entries with locale not in CATALOG_LOCALES are skipped.
 */
export function parseTranslations(
  formData: FormData,
  fields: TranslatableField[] = ["name", "description"],
): CatalogTranslation[] {
  const result: CatalogTranslation[] = [];
  const indices = new Set<number>();

  for (const key of formData.keys()) {
    const match = key.match(/^translations\[(\d+)\]\[locale\]$/);
    if (match) indices.add(Number(match[1]));
  }

  for (const idx of Array.from(indices).sort((a, b) => a - b)) {
    const locale = readString(formData, `translations[${idx}][locale]`);
    if (!CATALOG_LOCALES.includes(locale as CatalogTranslation["locale"])) continue;

    const entry: Record<string, string> = {};
    let hasValue = false;

    for (const field of fields) {
      const val = readString(formData, `translations[${idx}][${field}]`);
      if (val) {
        entry[field] = val;
        hasValue = true;
      }
    }

    if (!hasValue) continue;

    result.push({
      locale: locale as CatalogTranslation["locale"],
      ...entry,
    } as CatalogTranslation & Record<string, string>);
  }

  return result;
}

/**
 * Builds a create payload for catalogs that have `name` + `description`
 * (TranslatablePayload shape). Caller may override translatable fields.
 */
export function buildTranslatableCreate(
  formData: FormData,
  fields: TranslatableField[] = ["name", "description"],
  customFields?: Record<string, unknown>,
): Record<string, unknown> {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre es obligatorio.");
  const active = formData.has("active") ? parseBool(formData, "active") : true;
  const translations = parseTranslations(formData, fields);

  const payload: Record<string, unknown> = { name, active };

  // Include description when it's a configured translatable field
  if (fields.includes("description")) {
    const description = readString(formData, "description") || undefined;
    if (description !== undefined) payload.description = description;
  }

  // Include ideal when it's a configured translatable field
  if (fields.includes("ideal")) {
    const ideal = readString(formData, "ideal") || undefined;
    if (ideal !== undefined) payload.ideal = ideal;
  }

  if (translations.length > 0) payload.translations = translations;

  // Merge any caller-supplied extra fields (e.g. club_type_id, ideal_order)
  if (customFields) {
    for (const [k, v] of Object.entries(customFields)) {
      if (v !== null && v !== undefined) payload[k] = v;
    }
  }

  return payload;
}

/**
 * Builds an update payload for catalogs that have `name` (and optionally
 * `description` or `ideal`). Caller may override translatable fields.
 *
 * Only sends `translations` when the dirty flag is set.
 */
export function buildTranslatableUpdate(
  formData: FormData,
  fields: TranslatableField[] = ["name", "description"],
  customFields?: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const name = readString(formData, "name");
  if (name) payload.name = name;

  if (fields.includes("description")) {
    payload.description = readString(formData, "description") || "";
  }

  if (fields.includes("ideal")) {
    const ideal = readString(formData, "ideal");
    if (ideal) payload.ideal = ideal;
  }

  if (formData.has("active")) payload.active = parseBool(formData, "active");

  const dirty = formData.get("translations_dirty");
  if (dirty === "1") payload.translations = parseTranslations(formData, fields);

  if (customFields) {
    for (const [k, v] of Object.entries(customFields)) {
      if (v !== null && v !== undefined) payload[k] = v;
    }
  }

  return payload;
}

/**
 * Builds a create payload for name-only catalogs (no description, no ideal).
 */
function buildNameOnlyCreate(formData: FormData): Record<string, unknown> {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre es obligatorio.");
  const active = formData.has("active") ? parseBool(formData, "active") : true;
  const translations = parseTranslations(formData, ["name"]);
  return {
    name,
    active,
    ...(translations.length > 0 ? { translations } : {}),
  };
}

/**
 * Builds an update payload for name-only catalogs.
 */
function buildNameOnlyUpdate(formData: FormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const name = readString(formData, "name");
  if (name) payload.name = name;
  if (formData.has("active")) payload.active = parseBool(formData, "active");
  const dirty = formData.get("translations_dirty");
  if (dirty === "1") payload.translations = parseTranslations(formData, ["name"]);
  return payload;
}

// ─── Generic factory ───────────────────────────────────────────────────────────

type CrudPermissions = {
  create: string[];
  update: string[];
  delete: string[];
};

/**
 * Factory that generates (createAction, updateAction, deleteAction) for a
 * given catalog route.
 *
 * @param routePath    Dashboard path — used for revalidatePath + redirect
 * @param permissions  RBAC permission arrays (any-of semantics)
 * @param api          Object with create / update / delete async fns
 * @param hasDescription  When false, uses name-only builders (ignores translatableFields)
 * @param translatableFields  When hasDescription is true, overrides which fields
 *   are extracted from translations entries. Defaults to ['name', 'description'].
 *   Pass ['name', 'ideal'] for club-ideals.
 */
function makeActions(
  routePath: string,
  permissions: CrudPermissions,
  api: {
    create: (payload: Record<string, unknown>) => Promise<unknown>;
    update: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
    delete: (id: number) => Promise<unknown>;
  },
  hasDescription = true,
  translatableFields: TranslatableField[] = ["name", "description"],
) {
  async function createAction(
    _: GenericCatalogActionState,
    formData: FormData,
  ): Promise<GenericCatalogActionState> {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, permissions.create)) {
      return { error: "Sin permisos para crear." };
    }
    try {
      const payload = hasDescription
        ? buildTranslatableCreate(formData, translatableFields)
        : buildNameOnlyCreate(formData);
      await api.create(payload);
    } catch (error) {
      return {
        error: getActionErrorMessage(error, "No se pudo crear el registro.", {
          endpointLabel: routePath,
        }),
      };
    }
    revalidatePath(routePath);
    redirect(routePath);
  }

  async function updateAction(
    _: GenericCatalogActionState,
    formData: FormData,
  ): Promise<GenericCatalogActionState> {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, permissions.update)) {
      return { error: "Sin permisos para editar." };
    }
    const id = parsePositiveInt(formData, "id");
    if (!id) return { error: "No se pudo identificar el registro a editar." };
    try {
      const payload = hasDescription
        ? buildTranslatableUpdate(formData, translatableFields)
        : buildNameOnlyUpdate(formData);
      await api.update(id, payload);
    } catch (error) {
      return {
        error: getActionErrorMessage(error, "No se pudo actualizar el registro.", {
          endpointLabel: `${routePath}/${id}`,
        }),
      };
    }
    revalidatePath(routePath);
    redirect(routePath);
  }

  async function deleteAction(
    _: GenericCatalogActionState,
    formData: FormData,
  ): Promise<GenericCatalogActionState> {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, permissions.delete)) {
      return { error: "Sin permisos para eliminar." };
    }
    const id = parsePositiveInt(formData, "id");
    if (!id) return { error: "No se pudo identificar el registro a eliminar." };
    try {
      await api.delete(id);
    } catch (error) {
      return {
        error: getActionErrorMessage(error, "No se pudo eliminar el registro.", {
          endpointLabel: `${routePath}/${id}`,
        }),
      };
    }
    revalidatePath(routePath);
    redirect(routePath);
  }

  return { createAction, updateAction, deleteAction };
}

// ─── Countries ────────────────────────────────────────────────────────────────

const countriesActions = makeActions(
  "/dashboard/catalogs/geography/countries",
  {
    create: [COUNTRIES_CREATE, CATALOGS_CREATE],
    update: [COUNTRIES_UPDATE, CATALOGS_UPDATE],
    delete: [COUNTRIES_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminCountry(p as Parameters<typeof createAdminCountry>[0]),
    update: (id, p) => updateAdminCountry(id, p),
    delete: (id) => deleteAdminCountry(id),
  },
  false, // name only
);

export const createCountryAction = countriesActions.createAction;
export const updateCountryAction = countriesActions.updateAction;
export const deleteCountryAction = countriesActions.deleteAction;

// ─── Unions ───────────────────────────────────────────────────────────────────

const unionsActions = makeActions(
  "/dashboard/catalogs/geography/unions",
  {
    create: [UNIONS_CREATE, CATALOGS_CREATE],
    update: [UNIONS_UPDATE, CATALOGS_UPDATE],
    delete: [UNIONS_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminUnion(p as Parameters<typeof createAdminUnion>[0]),
    update: (id, p) => updateAdminUnion(id, p),
    delete: (id) => deleteAdminUnion(id),
  },
  false, // name only
);

export const createUnionAction = unionsActions.createAction;
export const updateUnionAction = unionsActions.updateAction;
export const deleteUnionAction = unionsActions.deleteAction;

// ─── Local Fields ─────────────────────────────────────────────────────────────

const localFieldsActions = makeActions(
  "/dashboard/catalogs/geography/local-fields",
  {
    create: [LOCAL_FIELDS_CREATE, CATALOGS_CREATE],
    update: [LOCAL_FIELDS_UPDATE, CATALOGS_UPDATE],
    delete: [LOCAL_FIELDS_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminLocalField(p as Parameters<typeof createAdminLocalField>[0]),
    update: (id, p) => updateAdminLocalField(id, p),
    delete: (id) => deleteAdminLocalField(id),
  },
  false, // name only
);

export const createLocalFieldAction = localFieldsActions.createAction;
export const updateLocalFieldAction = localFieldsActions.updateAction;
export const deleteLocalFieldAction = localFieldsActions.deleteAction;

// ─── Districts ────────────────────────────────────────────────────────────────

const districtsActions = makeActions(
  "/dashboard/catalogs/geography/districts",
  {
    create: [DISTRICTS_CREATE, CATALOGS_CREATE],
    update: [DISTRICTS_UPDATE, CATALOGS_UPDATE],
    delete: [DISTRICTS_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminDistrict(p as Parameters<typeof createAdminDistrict>[0]),
    update: (id, p) => updateAdminDistrict(id, p),
    delete: (id) => deleteAdminDistrict(id),
  },
  false, // name only
);

export const createDistrictAction = districtsActions.createAction;
export const updateDistrictAction = districtsActions.updateAction;
export const deleteDistrictAction = districtsActions.deleteAction;

// ─── Churches ─────────────────────────────────────────────────────────────────

const churchesActions = makeActions(
  "/dashboard/catalogs/geography/churches",
  {
    create: [CHURCHES_CREATE, CATALOGS_CREATE],
    update: [CHURCHES_UPDATE, CATALOGS_UPDATE],
    delete: [CHURCHES_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminChurch(p as Parameters<typeof createAdminChurch>[0]),
    update: (id, p) => updateAdminChurch(id, p),
    delete: (id) => deleteAdminChurch(id),
  },
  false, // name only
);

export const createChurchAction = churchesActions.createAction;
export const updateChurchAction = churchesActions.updateAction;
export const deleteChurchAction = churchesActions.deleteAction;

// ─── Relationship Types ───────────────────────────────────────────────────────

const relationshipTypesActions = makeActions(
  "/dashboard/catalogs/relationship-types",
  {
    create: [RELATIONSHIP_TYPES_CREATE, CATALOGS_CREATE],
    update: [RELATIONSHIP_TYPES_UPDATE, CATALOGS_UPDATE],
    delete: [RELATIONSHIP_TYPES_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminRelationshipType(p as Parameters<typeof createAdminRelationshipType>[0]),
    update: (id, p) => updateAdminRelationshipType(id, p),
    delete: (id) => deleteAdminRelationshipType(id),
  },
  true, // name + description
);

export const createRelationshipTypeAction = relationshipTypesActions.createAction;
export const updateRelationshipTypeAction = relationshipTypesActions.updateAction;
export const deleteRelationshipTypeAction = relationshipTypesActions.deleteAction;

// ─── Allergies ────────────────────────────────────────────────────────────────

const allergiesActions = makeActions(
  "/dashboard/catalogs/allergies",
  {
    create: [ALLERGIES_CREATE, CATALOGS_CREATE],
    update: [ALLERGIES_UPDATE, CATALOGS_UPDATE],
    delete: [ALLERGIES_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminAllergy(p as Parameters<typeof createAdminAllergy>[0]),
    update: (id, p) => updateAdminAllergy(id, p),
    delete: (id) => deleteAdminAllergy(id),
  },
  true, // name + description
);

export const createAllergyAction = allergiesActions.createAction;
export const updateAllergyAction = allergiesActions.updateAction;
export const deleteAllergyAction = allergiesActions.deleteAction;

// ─── Diseases ─────────────────────────────────────────────────────────────────

const diseasesActions = makeActions(
  "/dashboard/catalogs/diseases",
  {
    create: [DISEASES_CREATE, CATALOGS_CREATE],
    update: [DISEASES_UPDATE, CATALOGS_UPDATE],
    delete: [DISEASES_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminDisease(p as Parameters<typeof createAdminDisease>[0]),
    update: (id, p) => updateAdminDisease(id, p),
    delete: (id) => deleteAdminDisease(id),
  },
  true, // name + description
);

export const createDiseaseAction = diseasesActions.createAction;
export const updateDiseaseAction = diseasesActions.updateAction;
export const deleteDiseaseAction = diseasesActions.deleteAction;

// ─── Medicines ────────────────────────────────────────────────────────────────

const medicinesActions = makeActions(
  "/dashboard/catalogs/medicines",
  {
    create: [MEDICINES_CREATE, CATALOGS_CREATE],
    update: [MEDICINES_UPDATE, CATALOGS_UPDATE],
    delete: [MEDICINES_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminMedicine(p as Parameters<typeof createAdminMedicine>[0]),
    update: (id, p) => updateAdminMedicine(id, p),
    delete: (id) => deleteAdminMedicine(id),
  },
  true, // name + description
);

export const createMedicineAction = medicinesActions.createAction;
export const updateMedicineAction = medicinesActions.updateAction;
export const deleteMedicineAction = medicinesActions.deleteAction;

// ─── Club Types ───────────────────────────────────────────────────────────────

const clubTypesActions = makeActions(
  "/dashboard/catalogs/club-types",
  {
    create: [CLUB_TYPES_CREATE, CATALOGS_CREATE],
    update: [CLUB_TYPES_UPDATE, CATALOGS_UPDATE],
    delete: [CLUB_TYPES_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminClubType(p as Parameters<typeof createAdminClubType>[0]),
    update: (id, p) => updateAdminClubType(id, p),
    delete: (id) => deleteAdminClubType(id),
  },
  false, // name only
);

export const createClubTypeAction = clubTypesActions.createAction;
export const updateClubTypeAction = clubTypesActions.updateAction;
export const deleteClubTypeAction = clubTypesActions.deleteAction;

// ─── Club Ideals ──────────────────────────────────────────────────────────────
// Special: translatable fields are ['name', 'ideal'] — NOT description.
// Additional payload fields: club_type_id, ideal_order.

const clubIdealsActions = makeActions(
  "/dashboard/catalogs/club-ideals",
  {
    create: [CLUB_IDEALS_CREATE, CATALOGS_CREATE],
    update: [CLUB_IDEALS_UPDATE, CATALOGS_UPDATE],
    delete: [CLUB_IDEALS_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => {
      // Pull extra fields from the generic payload and forward to typed fn
      const { name, ideal, club_type_id, ideal_order, active, translations } = p as {
        name: string;
        ideal?: string | null;
        club_type_id?: number | null;
        ideal_order?: number | null;
        active?: boolean;
        translations?: CatalogTranslation[];
      };
      return createAdminClubIdeal({ name, ideal, club_type_id, ideal_order, active, translations });
    },
    update: (id, p) => {
      const { name, ideal, club_type_id, ideal_order, active, translations } = p as {
        name?: string;
        ideal?: string | null;
        club_type_id?: number | null;
        ideal_order?: number | null;
        active?: boolean;
        translations?: CatalogTranslation[];
      };
      return updateAdminClubIdeal(id, { name, ideal, club_type_id, ideal_order, active, translations });
    },
    delete: (id) => deleteAdminClubIdeal(id),
  },
  true,                       // hasDescription=true so factory uses buildTranslatableCreate/Update
  ["name", "ideal"],          // translatableFields override: ideal instead of description
);

export const createClubIdealAction = clubIdealsActions.createAction;
export const updateClubIdealAction = clubIdealsActions.updateAction;
export const deleteClubIdealAction = clubIdealsActions.deleteAction;

// ─── Activity Types ───────────────────────────────────────────────────────────
// Note: `code` is NOT translatable — only name + description are.

const activityTypesActions = makeActions(
  "/dashboard/catalogs/activity-types",
  {
    create: [ACTIVITY_TYPES_CREATE, CATALOGS_CREATE],
    update: [ACTIVITY_TYPES_UPDATE, CATALOGS_UPDATE],
    delete: [ACTIVITY_TYPES_DELETE, CATALOGS_DELETE],
  },
  {
    create: (p) => createAdminActivityType(p as Parameters<typeof createAdminActivityType>[0]),
    update: (id, p) => updateAdminActivityType(id, p),
    delete: (id) => deleteAdminActivityType(id),
  },
  true, // name + description (code passed through but not translatable)
);

export const createActivityTypeAction = activityTypesActions.createAction;
export const updateActivityTypeAction = activityTypesActions.updateAction;
export const deleteActivityTypeAction = activityTypesActions.deleteAction;
