import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FolderSectionRecord = {
  section_record_id: string;
  module_record_id: string;
  section_id: string;
  name: string;
  description: string | null;
  status: "pending" | "validated" | "rejected";
  points: number;
  files: FolderFile[];
};

export type FolderFile = {
  file_id: string;
  section_record_id: string;
  url: string;
  name: string | null;
  uploaded_at: string | null;
};

export type FolderModuleRecord = {
  module_record_id: string;
  folder_record_id: string;
  module_id: string;
  name: string;
  order: number;
  sections: FolderSectionRecord[];
};

export type FolderRecord = {
  folder_record_id: string;
  folder_id: string;
  section_id: string;
  club_id: string;
  status: "pending" | "submitted" | "reviewed";
  submitted_at: string | null;
  created_at: string | null;
  modules: FolderModuleRecord[];
};

// ─── Folder template types ─────────────────────────────────────────────────────

export type FolderTemplateSection = {
  section_id: string;
  module_id: string;
  name: string;
  description: string | null;
  order: number;
  required: boolean;
};

export type FolderModule = {
  module_id: string;
  folder_id: string;
  name: string;
  description: string | null;
  order: number;
  sections: FolderTemplateSection[];
};

export type FolderTemplate = {
  folder_id: string;
  name: string;
  description: string | null;
  active: boolean;
  club_type_ids: number[];
  created_at: string | null;
  updated_at: string | null;
  modules: FolderModule[];
};

// ─── Payloads ─────────────────────────────────────────────────────────────────

export type CreateFolderPayload = {
  name: string;
  description?: string | null;
  active?: boolean;
  club_type_ids?: number[];
};

export type UpdateFolderPayload = Partial<CreateFolderPayload>;

// ─── Server-side (reads) ──────────────────────────────────────────────────────

/**
 * GET /api/v1/folders/folders
 * Returns all folder templates.
 */
export async function fetchFolders(): Promise<FolderTemplate[]> {
  return apiRequest<FolderTemplate[]>("/folders/folders");
}

/**
 * GET /api/v1/folders/folders/:id
 * Returns a single folder template with its modules and sections.
 */
export async function fetchFolder(id: string): Promise<FolderTemplate> {
  return apiRequest<FolderTemplate>(`/folders/folders/${id}`);
}

// ─── Client-side (mutations) ──────────────────────────────────────────────────

/**
 * POST /api/v1/folders/folders
 * Creates a new folder template.
 * TODO: Backend endpoint not yet implemented — FoldersController only exposes GET routes.
 */
export async function createFolder(
  data: CreateFolderPayload,
): Promise<FolderTemplate> {
  return apiRequestFromClient<FolderTemplate>("/folders/folders", {
    method: "POST",
    body: data,
  });
}

/**
 * PATCH /api/v1/folders/folders/:id
 * Updates a folder template.
 * TODO: Backend endpoint not yet implemented — FoldersController only exposes GET routes.
 */
export async function updateFolder(
  id: string,
  data: UpdateFolderPayload,
): Promise<FolderTemplate> {
  return apiRequestFromClient<FolderTemplate>(`/folders/folders/${id}`, {
    method: "PATCH",
    body: data,
  });
}

/**
 * DELETE /api/v1/folders/folders/:id
 * Deletes a folder template.
 * TODO: Backend endpoint not yet implemented — FoldersController only exposes GET routes.
 */
export async function deleteFolder(id: string): Promise<void> {
  await apiRequestFromClient<unknown>(`/folders/folders/${id}`, {
    method: "DELETE",
  });
}

/**
 * GET /api/v1/clubs/:clubId/sections/:sectionId/evidence-folder
 * Returns the evidence folder progress for a specific club section.
 */
export async function fetchFolderProgress(
  clubId: string,
  sectionId: string,
): Promise<FolderRecord> {
  return apiRequestFromClient<FolderRecord>(
    `/clubs/${clubId}/sections/${sectionId}/evidence-folder`,
  );
}

/**
 * GET /api/v1/folders/folders/:folderId/progress
 * Returns progress across all clubs/sections using this folder template.
 * Note: This endpoint may not exist yet — falls back to empty array on 404.
 */
export async function fetchAllFolderProgress(
  folderId: string,
): Promise<FolderRecord[]> {
  return apiRequestFromClient<FolderRecord[]>(
    `/folders/folders/${folderId}/progress`,
  );
}

// ─── Client-side re-fetch ─────────────────────────────────────────────────────

/**
 * GET /api/v1/folders/folders (client-side)
 * Re-fetches the folder template list from the client.
 */
export async function fetchFoldersFromClient(): Promise<FolderTemplate[]> {
  return apiRequestFromClient<FolderTemplate[]>("/folders/folders");
}

/**
 * GET /api/v1/folders/folders/:id (client-side)
 * Re-fetches a single folder template from the client.
 */
export async function fetchFolderFromClient(id: string): Promise<FolderTemplate> {
  return apiRequestFromClient<FolderTemplate>(`/folders/folders/${id}`);
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Normalises the API response shape for folder template lists.
 * The backend wraps arrays in `{ data: [...] }` but direct array responses
 * are also handled for robustness.
 */
export function extractFolders(payload: unknown): FolderTemplate[] {
  if (Array.isArray(payload)) return payload as FolderTemplate[];
  if (payload && typeof payload === "object") {
    const root = payload as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data as FolderTemplate[];
  }
  return [];
}
