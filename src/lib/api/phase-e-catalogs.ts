/**
 * Phase E catalog API — classes, class_modules, class_sections,
 * finance_categories,
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

export type MasterHonorRuleGroupType =
  | "EXPLICIT_OPTIONS"
  | "CATEGORY_COUNT";

export type MasterHonorApplicabilityScope = "ALL" | "SELECTED_DIVISIONS";

export type MasterHonorRuleOptionPayload = {
  option_id?: number;
  label: string;
  display_order: number;
  honor_ids: number[];
  active?: boolean;
};

export type MasterHonorRuleGroupPayload = {
  group_id?: number;
  group_type: MasterHonorRuleGroupType;
  title?: string | null;
  description?: string | null;
  minimum_required: number;
  honors_category_id?: number | null;
  display_order: number;
  options: MasterHonorRuleOptionPayload[];
  active?: boolean;
};

export type ClassAvailabilityDurationPayload = {
  club_type_id?: number;
  available_from_year_id?: number | null;
  available_until_year_id?: number | null;
  min_duration_years?: number;
  max_duration_years?: number;
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
  available_from_year_id?: number | null;
  available_until_year_id?: number | null;
  min_duration_years?: number;
  max_duration_years?: number;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminClasses(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/classes", { params });
}

export async function createAdminClass(payload: TranslatablePayload & ClassAvailabilityDurationPayload) {
  return apiRequest("/admin/classes", { method: "POST", body: payload });
}

export async function updateAdminClass(id: number, payload: Partial<TranslatablePayload & ClassAvailabilityDurationPayload>) {
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

export async function updateAdminClassModule(id: number, payload: Partial<TranslatablePayload & { class_id?: number }>) {
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

export async function updateAdminClassSection(id: number, payload: Partial<TranslatablePayload & { module_id?: number }>) {
  return apiRequest(`/admin/class-sections/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminClassSection(id: number) {
  return apiRequest(`/admin/class-sections/${id}`, { method: "DELETE" });
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
  return apiRequest<unknown>("/admin/honors-catalog", { params });
}

export async function createAdminHonorCatalog(payload: TranslatablePayload & Record<string, unknown>) {
  return apiRequest("/admin/honors-catalog", { method: "POST", body: payload });
}

export async function updateAdminHonorCatalog(id: number, payload: Partial<TranslatablePayload> & Record<string, unknown>) {
  return apiRequest(`/admin/honors-catalog/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminHonorCatalog(id: number) {
  return apiRequest(`/admin/honors-catalog/${id}`, { method: "DELETE" });
}

// ─── Master Honors ────────────────────────────────────────────────────────────

export type AdminMasterHonor = {
  master_honor_id: number;
  name: string;
  description?: string | null;
  active?: boolean;
  philosophy?: string | null;
  notes?: string | null;
  applicability_scope?: MasterHonorApplicabilityScope;
  division_ids?: number[];
  requirement_groups?: MasterHonorRuleGroupPayload[];
  translations?: CatalogTranslation[];
};

export type MasterHonorPayload = {
  philosophy?: string;
  notes?: string;
  applicability_scope: MasterHonorApplicabilityScope;
  division_ids?: number[];
  requirement_groups: MasterHonorRuleGroupPayload[];
};

export async function listAdminMasterHonors(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/master-honors", { params });
}

export async function createAdminMasterHonor(payload: TranslatablePayload & MasterHonorPayload) {
  return apiRequest("/admin/master-honors", { method: "POST", body: payload });
}

export async function updateAdminMasterHonor(
  id: number,
  payload: Partial<TranslatablePayload & MasterHonorPayload>,
) {
  return apiRequest(`/admin/master-honors/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminMasterHonor(id: number) {
  return apiRequest(`/admin/master-honors/${id}`, { method: "DELETE" });
}

export async function recalculateMasterHonor(id: number) {
  return apiRequest(`/admin/master-honors/${id}/recalculate`, {
    method: "POST",
  });
}
