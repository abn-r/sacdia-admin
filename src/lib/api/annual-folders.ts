import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type FolderStatus = "open" | "submitted" | "closed";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FolderTemplateSection = {
  section_id: number;
  template_id: number;
  name: string;
  description: string | null;
  order: number;
  required: boolean;
  active: boolean;
  created_at: string | null;
};

export type FolderTemplate = {
  template_id: number;
  name: string;
  club_type_id: number;
  ecclesiastical_year_id: number;
  active: boolean;
  created_at: string | null;
  club_type?: { club_type_id: number; name: string } | null;
  ecclesiastical_year?: { ecclesiastical_year_id: number; name: string } | null;
  sections?: FolderTemplateSection[];
};

export type FolderEvidence = {
  evidence_id: number;
  folder_id: number;
  section_id: number;
  file_url: string;
  file_name: string | null;
  description: string | null;
  uploaded_at: string | null;
  uploaded_by: string | null;
};

export type FolderSectionWithEvidences = {
  section_id: number;
  name: string;
  description: string | null;
  order: number;
  required: boolean;
  evidences: FolderEvidence[];
};

export type AnnualFolder = {
  folder_id: number;
  enrollment_id: number;
  template_id: number;
  status: FolderStatus;
  submitted_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  template?: Pick<FolderTemplate, "template_id" | "name"> | null;
  sections?: FolderSectionWithEvidences[];
};

// ─── Payloads ─────────────────────────────────────────────────────────────────

export type CreateTemplatePayload = {
  name: string;
  club_type_id: number;
  ecclesiastical_year_id: number;
};

export type CreateTemplateSectionPayload = {
  name: string;
  description?: string;
  order: number;
  required: boolean;
};

export type UpdateTemplateSectionPayload = Partial<CreateTemplateSectionPayload>;

export type UpdateEvidencePayload = {
  description?: string;
};

// ─── Server-side (read) ───────────────────────────────────────────────────────

/**
 * GET /api/v1/annual-folders/templates/:templateId
 * Returns the template with its sections list.
 */
export async function getTemplate(templateId: number): Promise<FolderTemplate> {
  return apiRequest<FolderTemplate>(`/annual-folders/templates/${templateId}`);
}

/**
 * GET /api/v1/annual-folders/enrollment/:enrollmentId
 * Returns the annual folder for the given enrollment.
 */
export async function getFolderByEnrollment(
  enrollmentId: number,
): Promise<AnnualFolder> {
  return apiRequest<AnnualFolder>(
    `/annual-folders/enrollment/${enrollmentId}`,
  );
}

/**
 * GET /api/v1/annual-folders/:folderId
 * Returns the folder with all section evidences.
 */
export async function getFolder(folderId: number): Promise<AnnualFolder> {
  return apiRequest<AnnualFolder>(`/annual-folders/${folderId}`);
}

// ─── Client-side (mutations) ──────────────────────────────────────────────────

/**
 * POST /api/v1/annual-folders/templates
 * Creates a new annual-folder template.
 */
export async function createTemplate(
  payload: CreateTemplatePayload,
): Promise<FolderTemplate> {
  return apiRequestFromClient<FolderTemplate>("/annual-folders/templates", {
    method: "POST",
    body: payload,
  });
}

/**
 * POST /api/v1/annual-folders/templates/:templateId/sections
 * Adds a section to an existing template.
 */
export async function createTemplateSection(
  templateId: number,
  payload: CreateTemplateSectionPayload,
): Promise<FolderTemplateSection> {
  return apiRequestFromClient<FolderTemplateSection>(
    `/annual-folders/templates/${templateId}/sections`,
    { method: "POST", body: payload },
  );
}

/**
 * PATCH /api/v1/annual-folders/templates/sections/:sectionId
 * Updates a section (name, description, order, required).
 */
export async function updateTemplateSection(
  sectionId: number,
  payload: UpdateTemplateSectionPayload,
): Promise<FolderTemplateSection> {
  return apiRequestFromClient<FolderTemplateSection>(
    `/annual-folders/templates/sections/${sectionId}`,
    { method: "PATCH", body: payload },
  );
}

/**
 * DELETE /api/v1/annual-folders/templates/sections/:sectionId
 * Removes a section from a template.
 */
export async function deleteTemplateSection(
  sectionId: number,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/annual-folders/templates/sections/${sectionId}`,
    { method: "DELETE" },
  );
}

/**
 * POST /api/v1/annual-folders/:folderId/evidences
 * Uploads a file evidence for a section. Sends multipart/form-data.
 */
export async function uploadEvidence(
  folderId: number,
  sectionId: number,
  file: File,
  description?: string,
): Promise<FolderEvidence> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("section_id", String(sectionId));
  if (description) formData.append("description", description);

  return apiRequestFromClient<FolderEvidence>(
    `/annual-folders/${folderId}/evidences`,
    { method: "POST", body: formData },
  );
}

/**
 * PATCH /api/v1/annual-folders/evidences/:evidenceId
 * Updates evidence metadata (description).
 */
export async function updateEvidence(
  evidenceId: number,
  payload: UpdateEvidencePayload,
): Promise<FolderEvidence> {
  return apiRequestFromClient<FolderEvidence>(
    `/annual-folders/evidences/${evidenceId}`,
    { method: "PATCH", body: payload },
  );
}

/**
 * DELETE /api/v1/annual-folders/evidences/:evidenceId
 * Deletes an evidence file.
 */
export async function deleteEvidence(evidenceId: number): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/annual-folders/evidences/${evidenceId}`,
    { method: "DELETE" },
  );
}

/**
 * POST /api/v1/annual-folders/:folderId/submit
 * Submits the folder for review.
 */
export async function submitFolder(folderId: number): Promise<AnnualFolder> {
  return apiRequestFromClient<AnnualFolder>(
    `/annual-folders/${folderId}/submit`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/annual-folders/:folderId/close
 * Closes the folder (field-level action).
 */
export async function closeFolder(folderId: number): Promise<AnnualFolder> {
  return apiRequestFromClient<AnnualFolder>(
    `/annual-folders/${folderId}/close`,
    { method: "POST" },
  );
}
