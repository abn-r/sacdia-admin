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
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";
import {
  type TranslatableField,
  parsePositiveInt,
  buildTranslatableCreate,
  buildTranslatableUpdate,
  buildNameOnlyCreate,
  buildNameOnlyUpdate,
} from "@/lib/generic-catalogs-i18n/helpers";
import {
  createAdminCamporeeEventType,
  updateAdminCamporeeEventType,
  deleteAdminCamporeeEventType,
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

// ─── Generic factory ───────────────────────────────────────────────────────────

/** Screen id in the screen catalog; verbs are its `create` / `update` / `delete` capabilities. */
type CatalogScreenId = string;

/**
 * Factory that generates (createAction, updateAction, deleteAction) for a
 * given catalog route.
 *
 * @param routePath         Dashboard path — used for revalidatePath + redirect
 * @param screenId          Screen catalog id — gates copy the API (`create` / `update` / `delete`)
 * @param api               Object with create / update / delete async fns
 * @param hasDescription    When false, uses name-only builders (ignores translatableFields)
 * @param translatableFields  When hasDescription is true, overrides which fields
 *   are extracted from translations entries. Defaults to ['name', 'description'].
 *   Pass ['name', 'ideal'] for club-ideals.
 * @param customFormFields  Optional function that extracts additional fields from
 *   FormData and merges them into the payload. Used by club-ideals to pick up
 *   club_type_id and ideal_order which the standard builders don't extract.
 */
function makeActions(
  routePath: string,
  screenId: CatalogScreenId,
  api: {
    create: (payload: Record<string, unknown>) => Promise<unknown>;
    update: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
    delete: (id: number) => Promise<unknown>;
  },
  hasDescription = true,
  translatableFields: TranslatableField[] = ["name", "description"],
  customFormFields?: (formData: FormData) => Record<string, unknown>,
) {
  async function createAction(
    _: GenericCatalogActionState,
    formData: FormData,
  ): Promise<GenericCatalogActionState> {
    const user = await requireAdminUser();
    if (!canCapability(user, screenId, "create")) {
      return { error: "Sin permisos para crear." };
    }
    try {
      const base = hasDescription
        ? buildTranslatableCreate(formData, translatableFields)
        : buildNameOnlyCreate(formData);
      const payload = customFormFields
        ? { ...base, ...customFormFields(formData) }
        : base;
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
    if (!canCapability(user, screenId, "update")) {
      return { error: "Sin permisos para editar." };
    }
    const id = parsePositiveInt(formData, "id");
    if (!id) return { error: "No se pudo identificar el registro a editar." };
    try {
      const base = hasDescription
        ? buildTranslatableUpdate(formData, translatableFields)
        : buildNameOnlyUpdate(formData);
      const payload = customFormFields
        ? { ...base, ...customFormFields(formData) }
        : base;
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
    if (!canCapability(user, screenId, "delete")) {
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
  "catalogs-countries",
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
// Custom extra fields: abbreviation + country_id (parent FK).

function extractUnionExtraFields(formData: FormData): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  const abbreviation = String(formData.get("abbreviation") ?? "").trim();
  if (abbreviation) extra.abbreviation = abbreviation;

  const countryIdRaw = String(formData.get("country_id") ?? "").trim();
  if (countryIdRaw) {
    const n = Number(countryIdRaw);
    if (Number.isFinite(n) && n > 0) extra.country_id = Math.floor(n);
  }

  return extra;
}

const unionsActions = makeActions(
  "/dashboard/catalogs/geography/unions",
  "catalogs-unions",
  {
    create: (p) => createAdminUnion(p as Parameters<typeof createAdminUnion>[0]),
    update: (id, p) => updateAdminUnion(id, p),
    delete: (id) => deleteAdminUnion(id),
  },
  false, // name only base; extras merged in
  ["name"],
  extractUnionExtraFields,
);

export const createUnionAction = unionsActions.createAction;
export const updateUnionAction = unionsActions.updateAction;
export const deleteUnionAction = unionsActions.deleteAction;

// ─── Local Fields ─────────────────────────────────────────────────────────────
// Custom extra fields: abbreviation + union_id (parent FK).

function extractLocalFieldExtraFields(formData: FormData): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  const abbreviation = String(formData.get("abbreviation") ?? "").trim();
  if (abbreviation) extra.abbreviation = abbreviation;

  const unionIdRaw = String(formData.get("union_id") ?? "").trim();
  if (unionIdRaw) {
    const n = Number(unionIdRaw);
    if (Number.isFinite(n) && n > 0) extra.union_id = Math.floor(n);
  }

  return extra;
}

const localFieldsActions = makeActions(
  "/dashboard/catalogs/geography/local-fields",
  "catalogs-local-fields",
  {
    create: (p) => createAdminLocalField(p as Parameters<typeof createAdminLocalField>[0]),
    update: (id, p) => updateAdminLocalField(id, p),
    delete: (id) => deleteAdminLocalField(id),
  },
  false,
  ["name"],
  extractLocalFieldExtraFields,
);

export const createLocalFieldAction = localFieldsActions.createAction;
export const updateLocalFieldAction = localFieldsActions.updateAction;
export const deleteLocalFieldAction = localFieldsActions.deleteAction;

// ─── Districts ────────────────────────────────────────────────────────────────
// Custom extra field: local_field_id (parent FK).

function extractDistrictExtraFields(formData: FormData): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  const localFieldIdRaw = String(formData.get("local_field_id") ?? "").trim();
  if (localFieldIdRaw) {
    const n = Number(localFieldIdRaw);
    if (Number.isFinite(n) && n > 0) extra.local_field_id = Math.floor(n);
  }

  return extra;
}

const districtsActions = makeActions(
  "/dashboard/catalogs/geography/districts",
  "catalogs-districts",
  {
    create: (p) => createAdminDistrict(p as Parameters<typeof createAdminDistrict>[0]),
    update: (id, p) => updateAdminDistrict(id, p),
    delete: (id) => deleteAdminDistrict(id),
  },
  false,
  ["name"],
  extractDistrictExtraFields,
);

export const createDistrictAction = districtsActions.createAction;
export const updateDistrictAction = districtsActions.updateAction;
export const deleteDistrictAction = districtsActions.deleteAction;

// ─── Churches ─────────────────────────────────────────────────────────────────
// Custom extra field: district_id (parent FK).

function extractChurchExtraFields(formData: FormData): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  const districtIdRaw = String(formData.get("district_id") ?? "").trim();
  if (districtIdRaw) {
    const n = Number(districtIdRaw);
    if (Number.isFinite(n) && n > 0) extra.district_id = Math.floor(n);
  }

  return extra;
}

const churchesActions = makeActions(
  "/dashboard/catalogs/geography/churches",
  "catalogs-churches",
  {
    create: (p) => createAdminChurch(p as Parameters<typeof createAdminChurch>[0]),
    update: (id, p) => updateAdminChurch(id, p),
    delete: (id) => deleteAdminChurch(id),
  },
  false,
  ["name"],
  extractChurchExtraFields,
);

export const createChurchAction = churchesActions.createAction;
export const updateChurchAction = churchesActions.updateAction;
export const deleteChurchAction = churchesActions.deleteAction;

// ─── Relationship Types ───────────────────────────────────────────────────────

const relationshipTypesActions = makeActions(
  "/dashboard/catalogs/relationship-types",
  "catalogs-relationship-types",
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
  "catalogs-allergies",
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
  "catalogs-diseases",
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
  "catalogs-medicines",
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
  "catalogs-club-types",
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
// Additional payload fields: club_type_id, ideal_order (extracted via customFormFields).

function extractClubIdealExtraFields(formData: FormData): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  const clubTypeIdRaw = String(formData.get("club_type_id") ?? "").trim();
  if (clubTypeIdRaw) {
    const clubTypeId = Number(clubTypeIdRaw);
    if (Number.isFinite(clubTypeId) && clubTypeId > 0) {
      extra.club_type_id = Math.floor(clubTypeId);
    }
  }

  const idealOrderRaw = String(formData.get("ideal_order") ?? "").trim();
  if (idealOrderRaw) {
    const idealOrder = Number(idealOrderRaw);
    if (Number.isFinite(idealOrder) && idealOrder > 0) {
      extra.ideal_order = Math.floor(idealOrder);
    }
  }

  return extra;
}

const clubIdealsActions = makeActions(
  "/dashboard/catalogs/club-ideals",
  "catalogs-club-ideals",
  {
    create: (p) => {
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
  true,                            // hasDescription=true so factory uses buildTranslatableCreate/Update
  ["name", "ideal"],               // translatableFields override: ideal instead of description
  extractClubIdealExtraFields,     // pulls club_type_id + ideal_order from FormData
);

export const createClubIdealAction = clubIdealsActions.createAction;
export const updateClubIdealAction = clubIdealsActions.updateAction;
export const deleteClubIdealAction = clubIdealsActions.deleteAction;

// ─── Activity Types ───────────────────────────────────────────────────────────
// Note: `code` is NOT translatable — only name + description are.

const activityTypesActions = makeActions(
  "/dashboard/catalogs/activity-types",
  "catalogs-activity-types",
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

// ─── Camporee Event Types ─────────────────────────────────────────────────────
// Extra non-translatable fields: code + display_order.

function extractCamporeeEventTypeExtraFields(formData: FormData): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  const code = String(formData.get("code") ?? "").trim();
  if (code) extra.code = code;

  const displayOrderRaw = String(formData.get("display_order") ?? "").trim();
  if (displayOrderRaw) {
    const n = Number(displayOrderRaw);
    if (Number.isFinite(n)) extra.display_order = Math.floor(n);
  }

  return extra;
}

const camporeeEventTypesActions = makeActions(
  "/dashboard/catalogs/camporee-event-types",
  "catalogs-camporee-event-types",
  {
    create: (p) => createAdminCamporeeEventType(p as Parameters<typeof createAdminCamporeeEventType>[0]),
    update: (id, p) => updateAdminCamporeeEventType(id, p),
    delete: (id) => deleteAdminCamporeeEventType(id),
  },
  true, // name + description translatable
  ["name", "description"],
  extractCamporeeEventTypeExtraFields,
);

export const createCamporeeEventTypeAction = camporeeEventTypesActions.createAction;
export const updateCamporeeEventTypeAction = camporeeEventTypesActions.updateAction;
export const deleteCamporeeEventTypeAction = camporeeEventTypesActions.deleteAction;
