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
import { hasAnyPermission } from "@/lib/auth/permission-utils";
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
 * @param routePath         Dashboard path — used for revalidatePath + redirect
 * @param permissions       RBAC permission arrays (any-of semantics)
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
  permissions: CrudPermissions,
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
    if (!hasAnyPermission(user, permissions.create)) {
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
    if (!hasAnyPermission(user, permissions.update)) {
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
  {
    create: [CLUB_IDEALS_CREATE, CATALOGS_CREATE],
    update: [CLUB_IDEALS_UPDATE, CATALOGS_UPDATE],
    delete: [CLUB_IDEALS_DELETE, CATALOGS_DELETE],
  },
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
