/**
 * Phase E catalog API — classes, class_modules, class_sections,
 * folders, folder_modules, folder_sections, finance_categories,
 * inventory_categories, honors (admin CRUD), master_honors.
 *
 * All endpoints under /admin/* — backend commit: feat(i18n): Phase E admin CRUD.
 */
import { apiRequest } from "@/lib/api/client";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

// ─── Shared types ──────────────────────────────────────────────────────────────

export type PhaseEMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PhaseEListPayload<T> = {
  data: T[];
  meta?: PhaseEMeta;
};

export type TranslatablePayload = {
  name: string;
  description?: string | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export type NameOnlyPayload = {
  name: string;
  active?: boolean;
  translations?: CatalogTranslation[];
};

// ─── Classes ──────────────────────────────────────────────────────────────────

export type AdminClass = {
  class_id: number;
  name: string;
  description?: string | null;
  club_type_id?: number | null;
  display_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminClasses(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/classes", { params });
}

export async function createAdminClass(payload: TranslatablePayload) {
  return apiRequest("/admin/classes", { method: "POST", body: payload });
}

export async function updateAdminClass(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/classes/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminClass(id: number) {
  return apiRequest(`/admin/classes/${id}`, { method: "DELETE" });
}

// ─── Class Modules ────────────────────────────────────────────────────────────

export type AdminClassModule = {
  module_id: number;
  class_id: number;
  name: string;
  description?: string | null;
  display_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminClassModules(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/class-modules", { params });
}

export async function createAdminClassModule(payload: TranslatablePayload & { class_id?: number }) {
  return apiRequest("/admin/class-modules", { method: "POST", body: payload });
}

export async function updateAdminClassModule(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/class-modules/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminClassModule(id: number) {
  return apiRequest(`/admin/class-modules/${id}`, { method: "DELETE" });
}

// ─── Class Sections ───────────────────────────────────────────────────────────

export type AdminClassSection = {
  section_id: number;
  module_id: number;
  name: string;
  description?: string | null;
  display_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminClassSections(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/class-sections", { params });
}

export async function createAdminClassSection(payload: TranslatablePayload & { module_id?: number }) {
  return apiRequest("/admin/class-sections", { method: "POST", body: payload });
}

export async function updateAdminClassSection(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/class-sections/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminClassSection(id: number) {
  return apiRequest(`/admin/class-sections/${id}`, { method: "DELETE" });
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export type AdminFolder = {
  folder_id: number;
  name: string;
  description?: string | null;
  club_type_id?: number | null;
  display_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminFolders(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/folders", { params });
}

export async function createAdminFolder(payload: TranslatablePayload) {
  return apiRequest("/admin/folders", { method: "POST", body: payload });
}

export async function updateAdminFolder(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/folders/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminFolder(id: number) {
  return apiRequest(`/admin/folders/${id}`, { method: "DELETE" });
}

// ─── Folder Modules ───────────────────────────────────────────────────────────

export type AdminFolderModule = {
  module_id: number;
  folder_id: number;
  name: string;
  description?: string | null;
  display_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminFolderModules(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/folder-modules", { params });
}

export async function createAdminFolderModule(payload: TranslatablePayload & { folder_id?: number }) {
  return apiRequest("/admin/folder-modules", { method: "POST", body: payload });
}

export async function updateAdminFolderModule(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/folder-modules/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminFolderModule(id: number) {
  return apiRequest(`/admin/folder-modules/${id}`, { method: "DELETE" });
}

// ─── Folder Sections ──────────────────────────────────────────────────────────

export type AdminFolderSection = {
  section_id: number;
  module_id: number;
  name: string;
  description?: string | null;
  display_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminFolderSections(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/folder-sections", { params });
}

export async function createAdminFolderSection(payload: TranslatablePayload & { module_id?: number }) {
  return apiRequest("/admin/folder-sections", { method: "POST", body: payload });
}

export async function updateAdminFolderSection(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/folder-sections/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminFolderSection(id: number) {
  return apiRequest(`/admin/folder-sections/${id}`, { method: "DELETE" });
}

// ─── Finance Categories ───────────────────────────────────────────────────────

export type AdminFinanceCategory = {
  finance_category_id: number;
  name: string;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminFinanceCategories(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/finance-categories", { params });
}

export async function createAdminFinanceCategory(payload: NameOnlyPayload) {
  return apiRequest("/admin/finance-categories", { method: "POST", body: payload });
}

export async function updateAdminFinanceCategory(id: number, payload: Partial<NameOnlyPayload>) {
  return apiRequest(`/admin/finance-categories/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminFinanceCategory(id: number) {
  return apiRequest(`/admin/finance-categories/${id}`, { method: "DELETE" });
}

// ─── Inventory Categories ─────────────────────────────────────────────────────

export type AdminInventoryCategory = {
  inventory_category_id: number;
  name: string;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminInventoryCategories(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/inventory-categories", { params });
}

export async function createAdminInventoryCategory(payload: NameOnlyPayload) {
  return apiRequest("/admin/inventory-categories", { method: "POST", body: payload });
}

export async function updateAdminInventoryCategory(id: number, payload: Partial<NameOnlyPayload>) {
  return apiRequest(`/admin/inventory-categories/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminInventoryCategory(id: number) {
  return apiRequest(`/admin/inventory-categories/${id}`, { method: "DELETE" });
}

// ─── Admin Honors (catalog CRUD) ──────────────────────────────────────────────

export type AdminHonorCatalog = {
  honor_id: number;
  name: string;
  description?: string | null;
  active?: boolean;
  honors_category_id?: number | null;
  club_type_id?: number | null;
  skill_level?: number | null;
  translations?: CatalogTranslation[];
};

export async function listAdminHonorsCatalog(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/honors", { params });
}

export async function createAdminHonorCatalog(payload: TranslatablePayload & Record<string, unknown>) {
  return apiRequest("/admin/honors", { method: "POST", body: payload });
}

export async function updateAdminHonorCatalog(id: number, payload: Partial<TranslatablePayload> & Record<string, unknown>) {
  return apiRequest(`/admin/honors/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminHonorCatalog(id: number) {
  return apiRequest(`/admin/honors/${id}`, { method: "DELETE" });
}

// ─── Master Honors ────────────────────────────────────────────────────────────

export type AdminMasterHonor = {
  master_honor_id: number;
  name: string;
  description?: string | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminMasterHonors(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/master-honors", { params });
}

export async function createAdminMasterHonor(payload: TranslatablePayload) {
  return apiRequest("/admin/master-honors", { method: "POST", body: payload });
}

export async function updateAdminMasterHonor(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/master-honors/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminMasterHonor(id: number) {
  return apiRequest(`/admin/master-honors/${id}`, { method: "DELETE" });
}
