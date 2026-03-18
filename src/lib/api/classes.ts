import { apiRequest } from "@/lib/api/client";

export type ClassItem = {
  class_id: number;
  name: string;
  description?: string | null;
  club_type_id: number;
  display_order: number;
  max_points?: number;
  minimum_points?: number;
  active: boolean;
};

export type ClassModule = {
  module_id: number;
  name: string;
  title?: string;
  description?: string | null;
  display_order?: number;
  sections_count?: number;
  active?: boolean;
  sections?: ClassSection[];
};

export type ClassSection = {
  section_id: number;
  name?: string;
  title?: string;
  description?: string | null;
  display_order?: number;
  active?: boolean;
};

export type ClassDetail = ClassItem & {
  modules?: ClassModule[];
};

export type ClassListQuery = {
  clubTypeId?: number;
  page?: number;
  limit?: number;
};

export async function listClasses(query: ClassListQuery = {}) {
  return apiRequest<{ data: ClassItem[] }>("/classes", { params: query });
}

export async function getClassById(classId: number) {
  return apiRequest<ClassDetail>(`/classes/${classId}`);
}

export async function listClassModules(classId: number) {
  return apiRequest<ClassModule[]>(`/classes/${classId}/modules`);
}
