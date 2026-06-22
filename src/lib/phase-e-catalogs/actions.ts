"use server";

/**
 * Phase E — server actions for i18n catalog targets:
 * classes, class_modules, class_sections, finance_categories,
 * inventory_categories, honors, master_honors.
 *
 * Pattern mirrors honor-categories actions exactly.
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
  CLASSES_MANAGE,
  CLASS_MODULES_MANAGE,
  CLASS_SECTIONS_MANAGE,
  FINANCE_CATEGORIES_MANAGE,
  INVENTORY_CATEGORIES_MANAGE,
  HONORS_CREATE,
  HONORS_UPDATE,
  HONORS_DELETE,
  MASTER_HONORS_MANAGE,
} from "@/lib/auth/permissions";
import {
  createAdminClass,
  updateAdminClass,
  deleteAdminClass,
  createAdminClassModule,
  updateAdminClassModule,
  deleteAdminClassModule,
  createAdminClassSection,
  updateAdminClassSection,
  deleteAdminClassSection,
  createAdminFinanceCategory,
  updateAdminFinanceCategory,
  deleteAdminFinanceCategory,
  createAdminInventoryCategory,
  updateAdminInventoryCategory,
  deleteAdminInventoryCategory,
  createAdminHonorCatalog,
  updateAdminHonorCatalog,
  deleteAdminHonorCatalog,
  createAdminMasterHonor,
  updateAdminMasterHonor,
  deleteAdminMasterHonor,
  recalculateMasterHonor,
  type MasterHonorPayload,
  type MasterHonorRuleGroupPayload,
  type MasterHonorRuleOptionPayload,
  type MasterHonorRuleGroupType,
  type MasterHonorApplicabilityScope,
} from "@/lib/api/phase-e-catalogs";
import { parseClassConfigFormData } from "@/lib/classes/class-config";

// ─── Shared types ──────────────────────────────────────────────────────────────

export type PhaseEActionState = { error?: string };

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

function parseIntField(raw: string, min = 0): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < min) return null;
  return n;
}

function parseUnknownInt(value: unknown, min = 0): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= min) {
    return value;
  }
  if (typeof value === "string") {
    return parseIntField(value, min);
  }
  return null;
}

function parseUnknownString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseUnknownBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function parseIntList(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => parseUnknownInt(value, 1))
    .filter((v): v is number => v !== null && Number.isFinite(v));
}

const MASTER_HONOR_SCOPE_VALUES = ["ALL", "SELECTED_DIVISIONS"] as const;

function isMasterHonorApplicabilityScope(
  value: unknown,
): value is MasterHonorApplicabilityScope {
  return typeof value === "string" && (MASTER_HONOR_SCOPE_VALUES as readonly string[]).includes(value);
}

function normalizeMasterHonorApplicabilityScope(
  value: unknown,
): MasterHonorApplicabilityScope {
  return isMasterHonorApplicabilityScope(value) ? value : "ALL";
}

function normalizeScopeDivisionIds(
  rawScope: unknown,
  rawDivisionIds: unknown,
): { scope: MasterHonorApplicabilityScope; division_ids: number[] } {
  const scope = normalizeMasterHonorApplicabilityScope(rawScope);
  const division_ids = scope === "SELECTED_DIVISIONS"
    ? parseIntList(rawDivisionIds)
    : [];
  return { scope, division_ids };
}

function normalizeMasterHonorRuleOption(
  raw: unknown,
  index: number,
): MasterHonorRuleOptionPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error(`La opción ${index + 1} del grupo tiene estructura inválida.`);
  }
  const option = raw as Record<string, unknown>;
  const label = parseUnknownString(option.label);
  if (!label) throw new Error(`La opción ${index + 1} requiere etiqueta.`);

  const display_order = parseUnknownInt(option.display_order, 0);
  if (display_order === null) {
    throw new Error(`La opción "${label}" requiere un orden de visualización válido.`);
  }

  const honor_ids = parseIntList(option.honor_ids);
  if (honor_ids.length === 0) {
    throw new Error(`La opción "${label}" requiere al menos un honor.`);
  }

  const option_id = parseUnknownInt(option.option_id, 1);
  return {
    ...(option_id ? { option_id } : {}),
    label,
    display_order,
    honor_ids,
    ...(parseUnknownBool(option.active) !== undefined
      ? { active: parseUnknownBool(option.active) }
      : {}),
  };
}

function normalizeMasterHonorRuleGroup(
  raw: unknown,
  index: number,
): MasterHonorRuleGroupPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error(`El grupo ${index + 1} tiene estructura inválida.`);
  }

  const group = raw as Record<string, unknown>;
  const group_type = parseUnknownString(group.group_type) as MasterHonorRuleGroupType;
  if (group_type !== "EXPLICIT_OPTIONS" && group_type !== "CATEGORY_COUNT") {
    throw new Error(`El grupo ${index + 1} tiene un tipo inválido.`);
  }

  const minimum_required = parseUnknownInt(group.minimum_required, 1);
  if (minimum_required === null) {
    throw new Error(`El grupo ${index + 1} requiere un mínimo válido mayor o igual a 1.`);
  }

  const display_order = parseUnknownInt(group.display_order, 0);
  if (display_order === null) {
    throw new Error(`El grupo ${index + 1} requiere un orden de visualización válido.`);
  }

  const title = parseUnknownString(group.title);
  const description = parseUnknownString(group.description);
  const group_id = parseUnknownInt(group.group_id, 1);

  let options: MasterHonorRuleOptionPayload[] = [];
  let honors_category_id: number | null | undefined;

  if (group_type === "CATEGORY_COUNT") {
    honors_category_id = parseUnknownInt(group.honors_category_id, 1) ?? null;
    if (honors_category_id === null) {
      throw new Error(`El grupo ${index + 1} requiere una categoría de honor.`);
    }
  } else {
    const rawOptions = Array.isArray(group.options)
      ? group.options
      : [];
    options = rawOptions.map((option, optionIdx) =>
      normalizeMasterHonorRuleOption(option, optionIdx),
    );

    const activeOptions = options.filter((option) => option.active !== false).length;
    if (minimum_required > activeOptions) {
      throw new Error(`El mínimo del grupo ${index + 1} no puede superar las opciones activas.`);
    }
  }

  return {
    ...(group_id ? { group_id } : {}),
    group_type,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    minimum_required,
    ...(honors_category_id !== null && honors_category_id !== undefined
      ? { honors_category_id }
      : {}),
    display_order,
    options,
    ...(parseUnknownBool(group.active) !== undefined
      ? { active: parseUnknownBool(group.active) }
      : {}),
  };
}

function parseMasterHonorPayload(formData: FormData): MasterHonorPayload {
  const rawValue = formData.get("master_honor_payload");
  if (!rawValue || typeof rawValue !== "string") {
    return {
      applicability_scope: "ALL",
      division_ids: [],
      requirement_groups: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error("El payload de configuración de maestría es inválido.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("La configuración de maestría tiene formato inválido.");
  }

  const payload = parsed as Record<string, unknown>;
  const philosophy = parseUnknownString(payload.philosophy);
  const notes = parseUnknownString(payload.notes);
  const { scope, division_ids } = normalizeScopeDivisionIds(
    payload.applicability_scope,
    payload.division_ids,
  );

  if (scope === "SELECTED_DIVISIONS" && division_ids.length === 0) {
    throw new Error("La aplicación por divisiones exige al menos una división.");
  }

  const requirementGroupsRaw = Array.isArray(payload.requirement_groups)
    ? payload.requirement_groups
    : [];

  const requirement_groups = requirementGroupsRaw.map((group, index) =>
    normalizeMasterHonorRuleGroup(group, index),
  );

  return {
    ...(philosophy ? { philosophy } : {}),
    ...(notes ? { notes } : {}),
    applicability_scope: scope,
    division_ids,
    requirement_groups,
  };
}

function parseTranslations(formData: FormData): CatalogTranslation[] {
  const result: CatalogTranslation[] = [];
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^translations\[(\d+)\]\[locale\]$/);
    if (match) indices.add(Number(match[1]));
  }
  for (const idx of Array.from(indices).sort((a, b) => a - b)) {
    const locale = readString(formData, `translations[${idx}][locale]`);
    if (!CATALOG_LOCALES.includes(locale as CatalogTranslation["locale"])) continue;
    const name = readString(formData, `translations[${idx}][name]`) || null;
    const description = readString(formData, `translations[${idx}][description]`) || null;
    if (!name && !description) continue;
    result.push({
      locale: locale as CatalogTranslation["locale"],
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
    });
  }
  return result;
}

function buildTranslatableCreate(formData: FormData, requireName = true) {
  const name = readString(formData, "name");
  if (requireName && !name) throw new Error("El nombre es obligatorio.");
  const description = readString(formData, "description") || undefined;
  const active = formData.has("active") ? parseBool(formData, "active") : true;
  const translations = parseTranslations(formData);
  return {
    name,
    ...(description !== undefined ? { description } : {}),
    active,
    ...(translations.length > 0 ? { translations } : {}),
  };
}

function buildTranslatableUpdate(formData: FormData) {
  const payload: Record<string, unknown> = {};
  const name = readString(formData, "name");
  const description = readString(formData, "description");
  if (name) payload.name = name;
  payload.description = description || "";
  if (formData.has("active")) payload.active = parseBool(formData, "active");
  const dirty = formData.get("translations_dirty");
  if (dirty === "1") payload.translations = parseTranslations(formData);
  return payload;
}

function buildNameOnlyCreate(formData: FormData) {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre es obligatorio.");
  const active = formData.has("active") ? parseBool(formData, "active") : true;
  const translations = parseTranslations(formData);
  return {
    name,
    active,
    ...(translations.length > 0 ? { translations } : {}),
  };
}

function buildNameOnlyUpdate(formData: FormData) {
  const payload: Record<string, unknown> = {};
  const name = readString(formData, "name");
  if (name) payload.name = name;
  if (formData.has("active")) payload.active = parseBool(formData, "active");
  const dirty = formData.get("translations_dirty");
  if (dirty === "1") payload.translations = parseTranslations(formData);
  return payload;
}

// ─── Generic factory ───────────────────────────────────────────────────────────

type CrudPermissions = {
  create: string[];
  update: string[];
  delete: string[];
};

function makeActions(
  routePath: string,
  permissions: CrudPermissions,
  api: {
    create: (payload: Record<string, unknown>) => Promise<unknown>;
    update: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
    delete: (id: number) => Promise<unknown>;
  },
  hasDescription = true,
) {
  async function createAction(_: PhaseEActionState, formData: FormData): Promise<PhaseEActionState> {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, permissions.create)) {
      return { error: "Sin permisos para crear." };
    }
    try {
      const payload = hasDescription
        ? buildTranslatableCreate(formData)
        : buildNameOnlyCreate(formData);
      await api.create(payload as Record<string, unknown>);
    } catch (error) {
      return { error: getActionErrorMessage(error, "No se pudo crear el registro.", { endpointLabel: routePath }) };
    }
    revalidatePath(routePath);
    redirect(routePath);
  }

  async function updateAction(_: PhaseEActionState, formData: FormData): Promise<PhaseEActionState> {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, permissions.update)) {
      return { error: "Sin permisos para editar." };
    }
    const id = parsePositiveInt(formData, "id");
    if (!id) return { error: "No se pudo identificar el registro a editar." };
    try {
      const payload = hasDescription
        ? buildTranslatableUpdate(formData)
        : buildNameOnlyUpdate(formData);
      await api.update(id, payload);
    } catch (error) {
      return { error: getActionErrorMessage(error, "No se pudo actualizar el registro.", { endpointLabel: `${routePath}/${id}` }) };
    }
    revalidatePath(routePath);
    redirect(routePath);
  }

  async function deleteAction(_: PhaseEActionState, formData: FormData): Promise<PhaseEActionState> {
    const user = await requireAdminUser();
    if (!hasAnyPermission(user, permissions.delete)) {
      return { error: "Sin permisos para eliminar." };
    }
    const id = parsePositiveInt(formData, "id");
    if (!id) return { error: "No se pudo identificar el registro a eliminar." };
    try {
      await api.delete(id);
    } catch (error) {
      return { error: getActionErrorMessage(error, "No se pudo eliminar el registro.", { endpointLabel: `${routePath}/${id}` }) };
    }
    revalidatePath(routePath);
    redirect(routePath);
  }

  return { createAction, updateAction, deleteAction };
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export async function createClassAction(_: PhaseEActionState, formData: FormData): Promise<PhaseEActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CLASSES_MANAGE, CATALOGS_CREATE])) {
    return { error: "Sin permisos para crear." };
  }
  const config = parseClassConfigFormData(formData);
  if (!config.success) return { error: config.error };
  try {
    await createAdminClass({
      ...buildTranslatableCreate(formData),
      ...config.data,
    });
  } catch (error) {
    return { error: getActionErrorMessage(error, "No se pudo crear el registro.", { endpointLabel: "/admin/classes" }) };
  }
  revalidatePath("/dashboard/catalogs/classes");
  redirect("/dashboard/catalogs/classes");
}

export async function updateClassAction(_: PhaseEActionState, formData: FormData): Promise<PhaseEActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CLASSES_MANAGE, CATALOGS_UPDATE])) {
    return { error: "Sin permisos para editar." };
  }
  const id = parsePositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el registro a editar." };
  const config = parseClassConfigFormData(formData);
  if (!config.success) return { error: config.error };
  try {
    await updateAdminClass(id, {
      ...buildTranslatableUpdate(formData),
      ...config.data,
    });
  } catch (error) {
    return { error: getActionErrorMessage(error, "No se pudo actualizar el registro.", { endpointLabel: `/admin/classes/${id}` }) };
  }
  revalidatePath("/dashboard/catalogs/classes");
  redirect("/dashboard/catalogs/classes");
}

const classDeleteActions = makeActions(
  "/dashboard/catalogs/classes",
  { create: [CLASSES_MANAGE, CATALOGS_CREATE], update: [CLASSES_MANAGE, CATALOGS_UPDATE], delete: [CLASSES_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminClass(p as Parameters<typeof createAdminClass>[0]),
    update: (id, p) => updateAdminClass(id, p),
    delete: (id) => deleteAdminClass(id),
  },
  true,
);

export const deleteClassAction = classDeleteActions.deleteAction;

// ─── Class Modules ────────────────────────────────────────────────────────────

const classModulesActions = makeActions(
  "/dashboard/catalogs/class-modules",
  { create: [CLASS_MODULES_MANAGE, CATALOGS_CREATE], update: [CLASS_MODULES_MANAGE, CATALOGS_UPDATE], delete: [CLASS_MODULES_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminClassModule(p as Parameters<typeof createAdminClassModule>[0]),
    update: (id, p) => updateAdminClassModule(id, p),
    delete: (id) => deleteAdminClassModule(id),
  },
  true,
);

export const createClassModuleAction = classModulesActions.createAction;
export const updateClassModuleAction = classModulesActions.updateAction;
export const deleteClassModuleAction = classModulesActions.deleteAction;

// ─── Class Sections ───────────────────────────────────────────────────────────

const classSectionsActions = makeActions(
  "/dashboard/catalogs/class-sections",
  { create: [CLASS_SECTIONS_MANAGE, CATALOGS_CREATE], update: [CLASS_SECTIONS_MANAGE, CATALOGS_UPDATE], delete: [CLASS_SECTIONS_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminClassSection(p as Parameters<typeof createAdminClassSection>[0]),
    update: (id, p) => updateAdminClassSection(id, p),
    delete: (id) => deleteAdminClassSection(id),
  },
  true,
);

export const createClassSectionAction = classSectionsActions.createAction;
export const updateClassSectionAction = classSectionsActions.updateAction;
export const deleteClassSectionAction = classSectionsActions.deleteAction;

// ─── Finance Categories ───────────────────────────────────────────────────────

const finCatActions = makeActions(
  "/dashboard/catalogs/finance-categories",
  { create: [FINANCE_CATEGORIES_MANAGE, CATALOGS_CREATE], update: [FINANCE_CATEGORIES_MANAGE, CATALOGS_UPDATE], delete: [FINANCE_CATEGORIES_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminFinanceCategory(p as Parameters<typeof createAdminFinanceCategory>[0]),
    update: (id, p) => updateAdminFinanceCategory(id, p),
    delete: (id) => deleteAdminFinanceCategory(id),
  },
  false, // name only
);

export const createFinanceCategoryAction = finCatActions.createAction;
export const updateFinanceCategoryAction = finCatActions.updateAction;
export const deleteFinanceCategoryAction = finCatActions.deleteAction;

// ─── Inventory Categories ─────────────────────────────────────────────────────

const invCatActions = makeActions(
  "/dashboard/catalogs/inventory-categories",
  { create: [INVENTORY_CATEGORIES_MANAGE, CATALOGS_CREATE], update: [INVENTORY_CATEGORIES_MANAGE, CATALOGS_UPDATE], delete: [INVENTORY_CATEGORIES_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminInventoryCategory(p as Parameters<typeof createAdminInventoryCategory>[0]),
    update: (id, p) => updateAdminInventoryCategory(id, p),
    delete: (id) => deleteAdminInventoryCategory(id),
  },
  false, // name only
);

export const createInventoryCategoryAction = invCatActions.createAction;
export const updateInventoryCategoryAction = invCatActions.updateAction;
export const deleteInventoryCategoryAction = invCatActions.deleteAction;

// ─── Honors (catalog admin CRUD) ──────────────────────────────────────────────

const honorsAdminActions = makeActions(
  "/dashboard/catalogs/honors-catalog",
  { create: [HONORS_CREATE, CATALOGS_CREATE], update: [HONORS_UPDATE, CATALOGS_UPDATE], delete: [HONORS_DELETE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminHonorCatalog(p as Parameters<typeof createAdminHonorCatalog>[0]),
    update: (id, p) => updateAdminHonorCatalog(id, p),
    delete: (id) => deleteAdminHonorCatalog(id),
  },
  true,
);

export const createHonorCatalogAction = honorsAdminActions.createAction;
export const updateHonorCatalogAction = honorsAdminActions.updateAction;
export const deleteHonorCatalogAction = honorsAdminActions.deleteAction;

// ─── Master Honors ────────────────────────────────────────────────────────────

async function buildMasterHonorCreatePayload(formData: FormData) {
  const payload = {
    ...buildTranslatableCreate(formData),
    ...parseMasterHonorPayload(formData),
  };
  return payload;
}

async function buildMasterHonorUpdatePayload(formData: FormData) {
  const payload = {
    ...buildTranslatableUpdate(formData),
    ...parseMasterHonorPayload(formData),
  };
  return payload;
}

export async function createMasterHonorAction(
  _: PhaseEActionState,
  formData: FormData,
): Promise<PhaseEActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [MASTER_HONORS_MANAGE, CATALOGS_CREATE])) {
    return { error: "Sin permisos para crear." };
  }

  try {
    const payload = await buildMasterHonorCreatePayload(formData);
    await createAdminMasterHonor(payload as Parameters<typeof createAdminMasterHonor>[0]);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el registro.", {
        endpointLabel: "/admin/master-honors",
      }),
    };
  }

  revalidatePath("/dashboard/catalogs/master-honors");
  redirect("/dashboard/catalogs/master-honors");
}

export async function updateMasterHonorAction(
  _: PhaseEActionState,
  formData: FormData,
): Promise<PhaseEActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [MASTER_HONORS_MANAGE, CATALOGS_UPDATE])) {
    return { error: "Sin permisos para editar." };
  }

  const id = parsePositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el registro a editar." };

  try {
    const payload = await buildMasterHonorUpdatePayload(formData);
    await updateAdminMasterHonor(id, payload as Parameters<typeof updateAdminMasterHonor>[1]);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el registro.", {
        endpointLabel: `/admin/master-honors/${id}`,
      }),
    };
  }

  revalidatePath("/dashboard/catalogs/master-honors");
  redirect("/dashboard/catalogs/master-honors");
}

export async function deleteMasterHonorAction(
  _: PhaseEActionState,
  formData: FormData,
): Promise<PhaseEActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [MASTER_HONORS_MANAGE, CATALOGS_DELETE])) {
    return { error: "Sin permisos para eliminar." };
  }

  const id = parsePositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el registro a editar." };

  try {
    await deleteAdminMasterHonor(id);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el registro.", {
        endpointLabel: `/admin/master-honors/${id}`,
      }),
    };
  }

  revalidatePath("/dashboard/catalogs/master-honors");
  redirect("/dashboard/catalogs/master-honors");
}

export async function recalculateMasterHonorAction(
  _: PhaseEActionState,
  formData: FormData,
): Promise<PhaseEActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [MASTER_HONORS_MANAGE, CATALOGS_UPDATE])) {
    return { error: "Sin permisos para editar." };
  }

  const id = parsePositiveInt(formData, "id");
  if (!id) {
    return { error: "No se pudo identificar el registro a recalcular." };
  }

  try {
    await recalculateMasterHonor(id);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo recalcular la maestría.", {
        endpointLabel: `/admin/master-honors/${id}/recalculate`,
      }),
    };
  }

  revalidatePath("/dashboard/catalogs/master-honors");
  return {};
}
