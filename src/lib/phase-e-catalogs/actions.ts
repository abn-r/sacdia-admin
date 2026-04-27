"use server";

/**
 * Phase E — server actions for all 10 i18n catalog targets:
 * classes, class_modules, class_sections, folders, folder_modules,
 * folder_sections, finance_categories, inventory_categories, honors, master_honors.
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
  FOLDERS_MANAGE,
  FOLDER_MODULES_MANAGE,
  FOLDER_SECTIONS_MANAGE,
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
  createAdminFolder,
  updateAdminFolder,
  deleteAdminFolder,
  createAdminFolderModule,
  updateAdminFolderModule,
  deleteAdminFolderModule,
  createAdminFolderSection,
  updateAdminFolderSection,
  deleteAdminFolderSection,
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
} from "@/lib/api/phase-e-catalogs";

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

const classesActions = makeActions(
  "/dashboard/catalogs/classes",
  { create: [CLASSES_MANAGE, CATALOGS_CREATE], update: [CLASSES_MANAGE, CATALOGS_UPDATE], delete: [CLASSES_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminClass(p as Parameters<typeof createAdminClass>[0]),
    update: (id, p) => updateAdminClass(id, p),
    delete: (id) => deleteAdminClass(id),
  },
  true,
);

export const createClassAction = classesActions.createAction;
export const updateClassAction = classesActions.updateAction;
export const deleteClassAction = classesActions.deleteAction;

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

// ─── Folders ──────────────────────────────────────────────────────────────────

const foldersActions = makeActions(
  "/dashboard/catalogs/catalog-folders",
  { create: [FOLDERS_MANAGE, CATALOGS_CREATE], update: [FOLDERS_MANAGE, CATALOGS_UPDATE], delete: [FOLDERS_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminFolder(p as Parameters<typeof createAdminFolder>[0]),
    update: (id, p) => updateAdminFolder(id, p),
    delete: (id) => deleteAdminFolder(id),
  },
  true,
);

export const createFolderCatalogAction = foldersActions.createAction;
export const updateFolderCatalogAction = foldersActions.updateAction;
export const deleteFolderCatalogAction = foldersActions.deleteAction;

// ─── Folder Modules ───────────────────────────────────────────────────────────

const folderModulesActions = makeActions(
  "/dashboard/catalogs/folder-modules",
  { create: [FOLDER_MODULES_MANAGE, CATALOGS_CREATE], update: [FOLDER_MODULES_MANAGE, CATALOGS_UPDATE], delete: [FOLDER_MODULES_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminFolderModule(p as Parameters<typeof createAdminFolderModule>[0]),
    update: (id, p) => updateAdminFolderModule(id, p),
    delete: (id) => deleteAdminFolderModule(id),
  },
  true,
);

export const createFolderModuleAction = folderModulesActions.createAction;
export const updateFolderModuleAction = folderModulesActions.updateAction;
export const deleteFolderModuleAction = folderModulesActions.deleteAction;

// ─── Folder Sections ──────────────────────────────────────────────────────────

const folderSectionsActions = makeActions(
  "/dashboard/catalogs/folder-sections",
  { create: [FOLDER_SECTIONS_MANAGE, CATALOGS_CREATE], update: [FOLDER_SECTIONS_MANAGE, CATALOGS_UPDATE], delete: [FOLDER_SECTIONS_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminFolderSection(p as Parameters<typeof createAdminFolderSection>[0]),
    update: (id, p) => updateAdminFolderSection(id, p),
    delete: (id) => deleteAdminFolderSection(id),
  },
  true,
);

export const createFolderSectionAction = folderSectionsActions.createAction;
export const updateFolderSectionAction = folderSectionsActions.updateAction;
export const deleteFolderSectionAction = folderSectionsActions.deleteAction;

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

const masterHonorsActions = makeActions(
  "/dashboard/catalogs/master-honors",
  { create: [MASTER_HONORS_MANAGE, CATALOGS_CREATE], update: [MASTER_HONORS_MANAGE, CATALOGS_UPDATE], delete: [MASTER_HONORS_MANAGE, CATALOGS_DELETE] },
  {
    create: (p) => createAdminMasterHonor(p as Parameters<typeof createAdminMasterHonor>[0]),
    update: (id, p) => updateAdminMasterHonor(id, p),
    delete: (id) => deleteAdminMasterHonor(id),
  },
  true,
);

export const createMasterHonorAction = masterHonorsActions.createAction;
export const updateMasterHonorAction = masterHonorsActions.updateAction;
export const deleteMasterHonorAction = masterHonorsActions.deleteAction;
