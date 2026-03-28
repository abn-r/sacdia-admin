import { apiRequest } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResourceType = "document" | "audio" | "image" | "video_link" | "text";
export type ClubTypeTarget = "all" | "Aventureros" | "Conquistadores" | "Guías Mayores";
export type ScopeLevel = "system" | "union" | "local_field";

export type ResourceCategory = {
  resource_category_id: number;
  name: string;
  description?: string | null;
  active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ResourceCategoryPayload = {
  name: string;
  description?: string;
  active?: boolean;
};

export type Resource = {
  resource_id: number;
  title: string;
  description?: string | null;
  resource_type: ResourceType;
  category_id?: number | null;
  category?: ResourceCategory | null;
  club_type?: ClubTypeTarget | null;
  scope_level?: ScopeLevel | null;
  scope_id?: number | null;
  file_url?: string | null;
  external_url?: string | null;
  content?: string | null;
  uploaded_by?: number | null;
  uploader?: {
    user_id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ResourcePayload = {
  title: string;
  description?: string;
  resource_type: ResourceType;
  category_id?: number;
  club_type?: ClubTypeTarget;
  scope_level?: ScopeLevel;
  scope_id?: number;
  external_url?: string;
  content?: string;
  active?: boolean;
};

export type ResourceListQuery = {
  resource_type?: ResourceType;
  category_id?: number;
  club_type?: ClubTypeTarget;
  scope_level?: ScopeLevel;
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
};

export type ResourceCategoryListQuery = {
  active?: boolean;
  page?: number;
  limit?: number;
};

// ─── Resource Categories API ──────────────────────────────────────────────────

function buildCategoryListParams(query: ResourceCategoryListQuery) {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (typeof query.active === "boolean") params.active = query.active;
  if (typeof query.page === "number" && query.page > 0) params.page = Math.floor(query.page);
  if (typeof query.limit === "number" && query.limit > 0) params.limit = Math.min(500, Math.floor(query.limit));
  return params;
}

export async function listResourceCategories(query: ResourceCategoryListQuery = {}) {
  return apiRequest<unknown>("/resource-categories", { params: buildCategoryListParams(query) });
}

export async function createResourceCategory(payload: ResourceCategoryPayload) {
  return apiRequest("/resource-categories", { method: "POST", body: payload });
}

export async function updateResourceCategory(id: number, payload: Partial<ResourceCategoryPayload>) {
  return apiRequest(`/resource-categories/${id}`, { method: "PATCH", body: payload });
}

export async function deleteResourceCategory(id: number) {
  return apiRequest(`/resource-categories/${id}`, { method: "DELETE" });
}

// ─── Resources API ────────────────────────────────────────────────────────────

function buildResourceListParams(query: ResourceListQuery) {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.resource_type) params.resource_type = query.resource_type;
  if (query.category_id && query.category_id > 0) params.category_id = query.category_id;
  if (query.club_type) params.club_type = query.club_type;
  if (query.scope_level) params.scope_level = query.scope_level;
  if (query.search?.trim()) {
    params.search = query.search.trim();
    params.q = query.search.trim();
  }
  if (typeof query.active === "boolean") params.active = query.active;
  if (typeof query.page === "number" && query.page > 0) params.page = Math.floor(query.page);
  if (typeof query.limit === "number" && query.limit > 0) params.limit = Math.min(100, Math.floor(query.limit));
  return params;
}

export async function listResources(query: ResourceListQuery = {}) {
  return apiRequest<unknown>("/resources", { params: buildResourceListParams(query) });
}

export async function createResource(formData: FormData) {
  return apiRequest("/resources", { method: "POST", body: formData });
}

export async function updateResource(id: number, payload: Partial<ResourcePayload>) {
  return apiRequest(`/resources/${id}`, { method: "PATCH", body: payload });
}

export async function getResourceById(id: number) {
  return apiRequest<Resource>(`/resources/${id}`);
}

export async function deleteResource(id: number) {
  return apiRequest(`/resources/${id}`, { method: "DELETE" });
}

export async function getResourceSignedUrl(id: number) {
  return apiRequest<{ signed_url: string }>(`/resources/${id}/signed-url`);
}
