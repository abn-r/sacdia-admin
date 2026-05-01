import { apiRequest } from "@/lib/api/client";

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type ProgressiveClass = {
  class_id: number;
  name: string;
  description?: string | null;
  club_type_id: number;
  display_order: number;
  max_points?: number | null;
  minimum_points?: number | null;
  active: boolean;
};

/**
 * @deprecated Use ProgressiveClass. Kept for backwards-compat with existing callers.
 */
export type ClassItem = ProgressiveClass;

export type ClassRequirement = {
  requirement_id: number;
  description: string;
  display_order?: number | null;
  active?: boolean;
};

export type ClassSection = {
  section_id: number;
  name?: string;
  title?: string;
  description?: string | null;
  display_order?: number | null;
  active?: boolean;
  requirements?: ClassRequirement[];
};

export type ClassModule = {
  module_id: number;
  name: string;
  title?: string;
  description?: string | null;
  display_order?: number | null;
  sections_count?: number;
  active?: boolean;
  sections?: ClassSection[];
};

export type ClassDetail = ProgressiveClass & {
  modules?: ClassModule[];
};

// ─── Query Types ──────────────────────────────────────────────────────────────

export type ClassListQuery = {
  clubTypeId?: number;
  page?: number;
  limit?: number;
};

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * List all progressive classes (public catalog endpoint).
 * Returns paginated payload: { data: ProgressiveClass[] }
 */
export async function listClasses(query: ClassListQuery = {}) {
  return apiRequest<{ data: ProgressiveClass[] }>("/classes", { params: query });
}

/**
 * Get a single class with its full module/section tree.
 * NOTE: Backend returns the class at the root level or inside a `data` wrapper.
 */
export async function getClassById(classId: number) {
  return apiRequest<ClassDetail>(`/classes/${classId}`);
}

/**
 * Get all modules (with their sections) for a specific class.
 * NOTE: No admin CRUD endpoints exist for classes in the backend as of 2026-03-27.
 * This page is intentionally read-only.
 */
export async function listClassModules(classId: number) {
  return apiRequest<ClassModule[]>(`/classes/${classId}/modules`);
}
