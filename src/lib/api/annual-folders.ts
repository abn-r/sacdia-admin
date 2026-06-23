import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type FolderStatus =
  | "open"
  | "submitted"
  | "under_evaluation"
  | "evaluated"
  | "closed";

/** Per-section evaluation lifecycle status returned by GET /annual-folders/:id */
export type SectionEvaluationStatus =
  | "PENDING"
  | "SUBMITTED"
  | "PREAPPROVED_LF"
  | "VALIDATED"
  | "REJECTED";

/** Union-level decision when both actors have acted */
export type UnionDecision = "APPROVED" | "REJECTED_OVERRIDE" | null;
export type UnionConfirmationDecision = Exclude<UnionDecision, null>;

/** Compact user reference hydrated in evaluation actor fields */
export type UserSummary = {
  id: string;
  name: string;
  email: string;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type FolderTemplateSection = {
  section_id: string;
  template_id: string;
  name: string;
  description: string | null;
  order: number;
  required: boolean;
  active: boolean;
  max_points: number;
  minimum_points: number;
  created_at: string | null;
};

export type SectionEvaluation = {
  evaluation_id: string;
  section_id: string;
  section_name: string | null;
  section_order: number | null;
  earned_points: number;
  max_points: number;
  notes: string | null;
  /** @deprecated Use `status` instead — backend no longer returns `evaluator`/`evaluated_at` at top level */
  evaluator: string | null;
  evaluated_at: string;
  // ── Dual-actor fields (T-B2-8) ─────────────────────────────────────────────
  /** Current evaluation lifecycle status */
  status: SectionEvaluationStatus;
  /** Local Field approver — present once LF has reviewed */
  lf_approver: UserSummary | null;
  /** ISO timestamp of LF approval */
  lf_approved_at: string | null;
  /** Union approver — present once Union has reviewed */
  union_approver: UserSummary | null;
  /** ISO timestamp of Union approval */
  union_approved_at: string | null;
  /** Union-level decision; non-null only when union has acted */
  union_decision: UnionDecision;
};

export type FolderTemplate = {
  template_id: string;
  name: string;
  club_type_id: number;
  ecclesiastical_year_id: number;
  active: boolean;
  minimum_points: number;
  closing_date: string | null;
  created_at: string | null;
  /** Exactly one of these will be set; the other will be null (DB CHECK constraint). */
  owner_union_id: number | null;
  owner_local_field_id: number | null;
  club_type?: { club_type_id: number; name: string } | null;
  ecclesiastical_year?: { ecclesiastical_year_id: number; name: string } | null;
  /** Populated when the template is fetched with relations. */
  owner_union?: { union_id: number; name: string } | null;
  owner_local_field?: { local_field_id: number; name: string } | null;
  sections?: FolderTemplateSection[];
};

export type FolderEvidence = {
  evidence_id: string;
  annual_folder_id: string;
  section_id: string;
  file_url: string;
  file_name: string | null;
  description: string | null;
  uploaded_at: string | null;
  created_at?: string | null;
  uploaded_by: string | null;
  notes?: string | null;
  reviewer_note?: string | null;
  reviewer_noted_by?: string | null;
  reviewer_noted_at?: string | null;
};

export type FolderSectionSubmission = {
  section_submission_id: string;
  section_id: string;
  annual_folder_id?: string;
  submitted_at: string | null;
  submitted_by: string | null;
};

export type FolderSectionWithEvidences = {
  section_id: string;
  name: string;
  description: string | null;
  order: number;
  required: boolean;
  // Present when the folder was fetched with scoring context
  max_points?: number;
  earned_points?: number | null;
  evaluations?: SectionEvaluationEntry[];
  evaluation?: {
    evaluation_id: string;
    status: SectionEvaluationStatus;
    earned_points: number;
    max_points: number;
    notes: string | null;
  } | null;
  submission?: FolderSectionSubmission | null;
  evidences: FolderEvidence[];
};

export type SectionEvaluationEntry = {
  evaluation_id: string;
  earned_points: number;
  notes: string | null;
  evaluator: string | null;
  evaluated_at: string;
};

export type AnnualFolder = {
  annual_folder_id: string;
  club_enrollment_id: string;
  folder_template_id: string;
  status: FolderStatus;
  submitted_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  // Scoring fields (populated by GET /annual-folders/:folderId when evaluations exist)
  total_earned_points?: number;
  total_max_points?: number;
  progress_percentage?: number;
  evaluated_at?: string | null;
  local_camporee_id: number | null;
  union_camporee_id: number | null;
  requires_union_confirmation: boolean;
  template?: Pick<FolderTemplate, "template_id" | "name"> | null;
  sections?: FolderSectionWithEvidences[];
  // Human-facing enrollment context. IDs are kept for API use; UI should prefer names.
  club_enrollment?: {
    club_enrollment_id: string;
    club_section_id: number;
    ecclesiastical_year_id: number;
    status: string;
    club_section: {
      club_section_id: number;
      name: string | null;
      club_type: { name: string } | null;
      club: {
        club_id: number;
        name: string;
        local_field: {
          local_field_id: number;
          name: string;
          union: { union_id: number; name: string } | null;
        } | null;
      } | null;
    } | null;
    ecclesiastical_year: {
      year_id: number;
      start_date: string;
      end_date: string;
      label: string;
    } | null;
  } | null;
};

export type AnnualFolderEvaluationQueueStatus =
  | "needs_review"
  | "submitted"
  | "preapproved"
  | "evaluated"
  | "all";

export type AnnualFolderEvaluationQueueItem = {
  annual_folder_id: string;
  display_name: string;
  club_name: string;
  club_section_name: string;
  club_type_name: string | null;
  local_field_name: string | null;
  union_name: string | null;
  template_name: string;
  year_label: string;
  folder_status: FolderStatus;
  total_sections: number;
  total_evidences: number;
  submitted_sections_count: number;
  preapproved_sections_count: number;
  validated_sections_count: number;
  rejected_sections_count: number;
  pending_section_names: string[];
  latest_submitted_at: string | null;
  created_at: string | null;
};

export type PaginatedAnnualFolderEvaluationQueue = {
  data: AnnualFolderEvaluationQueueItem[];
  total: number;
  page: number;
  limit: number;
};

type AnnualFolderWire = AnnualFolder & {
  folder_id?: string;
  enrollment_id?: string;
  template_id?: string;
};

type FolderTemplateSectionWire = Omit<FolderTemplateSection, "template_id"> & {
  template_id?: string;
  folder_template_id?: string;
};

type FolderTemplateWire = Omit<FolderTemplate, "template_id" | "sections"> & {
  template_id?: string;
  folder_template_id?: string;
  sections?: FolderTemplateSectionWire[];
};

type SectionSubmissionWire = FolderSectionSubmission & {
  folder_id?: string;
};

type FolderEvidenceWire = FolderEvidence & {
  folder_id?: string;
  created_at?: string | null;
};

type ApiEnvelope<T> = { status: string; data: T };

function unwrapApiData<T>(value: T | ApiEnvelope<T>): T {
  if (
    value &&
    typeof value === "object" &&
    "data" in value &&
    "status" in value
  ) {
    return (value as ApiEnvelope<T>).data;
  }
  return value as T;
}

function normalizeAnnualFolder(folder: AnnualFolderWire): AnnualFolder {
  return {
    ...folder,
    annual_folder_id: folder.annual_folder_id ?? folder.folder_id ?? "",
    club_enrollment_id: folder.club_enrollment_id ?? folder.enrollment_id ?? "",
    folder_template_id: folder.folder_template_id ?? folder.template_id ?? "",
    template: folder.template
      ? normalizeFolderTemplate(folder.template as FolderTemplateWire)
      : folder.template,
    sections: folder.sections?.map((section) => ({
      ...section,
      evidences: (section.evidences ?? []).map((evidence) => ({
        ...evidence,
        annual_folder_id:
          evidence.annual_folder_id ??
          (evidence as FolderEvidenceWire).folder_id ??
          "",
        uploaded_at:
          evidence.uploaded_at ?? (evidence as FolderEvidenceWire).created_at ?? null,
      })),
    })),
  };
}

function normalizeFolderTemplateSection(
  section: FolderTemplateSectionWire,
): FolderTemplateSection {
  return {
    ...section,
    template_id: section.template_id ?? section.folder_template_id ?? "",
  };
}

function normalizeFolderTemplate(template: FolderTemplateWire): FolderTemplate {
  return {
    ...template,
    template_id: template.template_id ?? template.folder_template_id ?? "",
    sections: template.sections?.map(normalizeFolderTemplateSection),
  };
}

function normalizeSectionSubmission(
  submission: SectionSubmissionWire,
): FolderSectionSubmission {
  return {
    ...submission,
    annual_folder_id: submission.annual_folder_id ?? submission.folder_id,
  };
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export type CreateTemplatePayload = {
  name: string;
  club_type_id: number;
  ecclesiastical_year_id: number;
  active?: boolean;
  minimum_points?: number;
  closing_date?: string | null;
  /** Exactly one must be provided; the other must be omitted / null. */
  owner_union_id?: number | null;
  owner_local_field_id?: number | null;
};

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

export type CreateTemplateSectionPayload = {
  name: string;
  description?: string;
  order: number;
  required: boolean;
  max_points: number;
  minimum_points?: number;
};

export type UpdateTemplateSectionPayload =
  Partial<CreateTemplateSectionPayload>;

export type UpdateEvidencePayload = {
  description?: string;
};

// ─── Server-side (read) ───────────────────────────────────────────────────────

/**
 * GET /api/v1/annual-folders/templates/:templateId
 * Returns the template with its sections list.
 */
export async function getTemplate(templateId: string): Promise<FolderTemplate> {
  const res = await apiRequest<
    FolderTemplateWire | ApiEnvelope<FolderTemplateWire>
  >(`/annual-folders/templates/${templateId}`);
  return normalizeFolderTemplate(unwrapApiData(res));
}

/**
 * GET /api/v1/annual-folders/templates
 * Returns annual-folder templates for the admin list.
 */
export async function listTemplates(): Promise<FolderTemplate[]> {
  const res = await apiRequest<
    FolderTemplateWire[] | ApiEnvelope<FolderTemplateWire[]>
  >("/annual-folders/templates");
  return unwrapApiData(res).map(normalizeFolderTemplate);
}

/**
 * GET /api/v1/club-sections/:sectionId/annual-folder
 * Returns the annual folder for a club section in the current ecclesiastical year.
 * The backend returns data: null when the section has no active enrollment/folder yet.
 */
export async function getFolderBySection(
  sectionId: number,
): Promise<AnnualFolder | null> {
  const res = await apiRequest<
    AnnualFolderWire | null | ApiEnvelope<AnnualFolderWire | null>
  >(`/club-sections/${sectionId}/annual-folder`);
  const folder = unwrapApiData(res);
  return folder ? normalizeAnnualFolder(folder) : null;
}

/**
 * GET /api/v1/annual-folders/by-enrollment/:enrollmentId
 * Returns the annual folder for the given enrollment.
 */
export async function getFolderByEnrollment(
  enrollmentId: string,
): Promise<AnnualFolder> {
  const res = await apiRequest<
    AnnualFolderWire | ApiEnvelope<AnnualFolderWire>
  >(`/annual-folders/by-enrollment/${enrollmentId}`);
  const folder = unwrapApiData(res);
  return normalizeAnnualFolder(folder);
}

/**
 * GET /api/v1/annual-folders/:folderId
 * Returns the folder with all section evidences.
 */
export async function getFolder(folderId: string): Promise<AnnualFolder> {
  const res = await apiRequest<
    AnnualFolderWire | ApiEnvelope<AnnualFolderWire>
  >(`/annual-folders/${folderId}`);
  const folder = unwrapApiData(res);
  return normalizeAnnualFolder(folder);
}

/**
 * GET /api/v1/annual-folders/evaluation/queue
 * Returns human-readable folders available for evaluation.
 */
export async function getEvaluationQueue(params?: {
  search?: string;
  status?: AnnualFolderEvaluationQueueStatus;
  page?: number;
  limit?: number;
}): Promise<PaginatedAnnualFolderEvaluationQueue> {
  const res = await apiRequest<
    | PaginatedAnnualFolderEvaluationQueue
    | ApiEnvelope<PaginatedAnnualFolderEvaluationQueue>
  >("/annual-folders/evaluation/queue", { params });
  return unwrapApiData(res);
}

// ─── Client-side (mutations) ──────────────────────────────────────────────────

/**
 * POST /api/v1/annual-folders/templates
 * Creates a new annual-folder template.
 */
export async function createTemplate(
  payload: CreateTemplatePayload,
): Promise<FolderTemplate> {
  const res = await apiRequestFromClient<
    FolderTemplateWire | ApiEnvelope<FolderTemplateWire>
  >("/annual-folders/templates", {
    method: "POST",
    body: payload,
  });
  return normalizeFolderTemplate(unwrapApiData(res));
}

/**
 * PATCH /api/v1/annual-folders/templates/:templateId
 * Updates an existing annual-folder template.
 */
export async function updateTemplate(
  templateId: string,
  payload: UpdateTemplatePayload,
): Promise<FolderTemplate> {
  const res = await apiRequestFromClient<
    FolderTemplateWire | ApiEnvelope<FolderTemplateWire>
  >(`/annual-folders/templates/${templateId}`, {
    method: "PATCH",
    body: payload,
  });
  return normalizeFolderTemplate(unwrapApiData(res));
}

/**
 * POST /api/v1/annual-folders/enrollments/:enrollmentId
 * Creates the annual evidence folder for an existing section enrollment.
 */
export async function createFolderForEnrollment(
  enrollmentId: string,
): Promise<AnnualFolder> {
  const res = await apiRequestFromClient<
    AnnualFolderWire | ApiEnvelope<AnnualFolderWire>
  >(`/annual-folders/enrollments/${enrollmentId}`, { method: "POST" });
  return normalizeAnnualFolder(unwrapApiData(res));
}

/**
 * POST /api/v1/club-sections/:sectionId/annual-folder
 * Creates the annual evidence folder for the active-year enrollment of a club section.
 * This is the user-facing creation path; the UI does not ask users for enrollment UUIDs.
 */
export async function createFolderForSection(
  sectionId: number,
): Promise<AnnualFolder> {
  const res = await apiRequestFromClient<
    AnnualFolderWire | ApiEnvelope<AnnualFolderWire>
  >(`/club-sections/${sectionId}/annual-folder`, { method: "POST" });
  return normalizeAnnualFolder(unwrapApiData(res));
}

/**
 * POST /api/v1/annual-folders/templates/:templateId/sections
 * Adds a section to an existing template.
 */
export async function createTemplateSection(
  templateId: string,
  payload: CreateTemplateSectionPayload,
): Promise<FolderTemplateSection> {
  const res = await apiRequestFromClient<
    FolderTemplateSectionWire | ApiEnvelope<FolderTemplateSectionWire>
  >(`/annual-folders/templates/${templateId}/sections`, {
    method: "POST",
    body: payload,
  });
  return normalizeFolderTemplateSection(unwrapApiData(res));
}

/**
 * PATCH /api/v1/annual-folders/templates/sections/:sectionId
 * Updates a section (name, description, order, required).
 */
export async function updateTemplateSection(
  sectionId: string,
  payload: UpdateTemplateSectionPayload,
): Promise<FolderTemplateSection> {
  const res = await apiRequestFromClient<
    FolderTemplateSectionWire | ApiEnvelope<FolderTemplateSectionWire>
  >(`/annual-folders/templates/sections/${sectionId}`, {
    method: "PATCH",
    body: payload,
  });
  return normalizeFolderTemplateSection(unwrapApiData(res));
}

/**
 * DELETE /api/v1/annual-folders/templates/sections/:sectionId
 * Removes a section from a template.
 */
export async function deleteTemplateSection(
  sectionId: string,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/annual-folders/templates/sections/${sectionId}`,
    { method: "DELETE" },
  );
}

/**
 * POST /api/v1/annual-folders/:folderId/sections/:sectionId/evidences
 * Uploads a file evidence for a section. Sends multipart/form-data.
 */
export async function uploadEvidence(
  folderId: string,
  sectionId: string,
  file: File,
  notes?: string,
): Promise<FolderEvidence> {
  const formData = new FormData();
  formData.append("file", file);
  if (notes) formData.append("notes", notes);

  return apiRequestFromClient<FolderEvidence>(
    `/annual-folders/${folderId}/sections/${sectionId}/evidences`,
    { method: "POST", body: formData },
  );
}

/**
 * PATCH /api/v1/annual-folders/evidences/:evidenceId
 * Updates evidence metadata (description).
 */
export async function updateEvidence(
  evidenceId: string,
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
export async function deleteEvidence(evidenceId: string): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/annual-folders/evidences/${evidenceId}`,
    { method: "DELETE" },
  );
}

/**
 * POST /api/v1/annual-folders/:folderId/sections/:sectionId/submit
 * Submits one folder section before the complete folder can be submitted.
 */
export async function submitSection(
  folderId: string,
  sectionId: string,
): Promise<FolderSectionSubmission> {
  const res = await apiRequestFromClient<
    SectionSubmissionWire | ApiEnvelope<SectionSubmissionWire>
  >(`/annual-folders/${folderId}/sections/${sectionId}/submit`, {
    method: "POST",
  });
  return normalizeSectionSubmission(unwrapApiData(res));
}

/**
 * POST /api/v1/annual-folders/:folderId/submit
 * Submits the folder for review.
 */
export async function submitFolder(folderId: string): Promise<AnnualFolder> {
  const res = await apiRequestFromClient<
    AnnualFolderWire | ApiEnvelope<AnnualFolderWire>
  >(
    `/annual-folders/${folderId}/submit`,
    { method: "POST" },
  );
  return normalizeAnnualFolder(unwrapApiData(res));
}

/**
 * POST /api/v1/annual-folders/:folderId/close
 * Closes the folder (field-level action).
 */
export async function closeFolder(folderId: string): Promise<AnnualFolder> {
  const res = await apiRequestFromClient<
    AnnualFolderWire | ApiEnvelope<AnnualFolderWire>
  >(
    `/annual-folders/${folderId}/close`,
    { method: "POST" },
  );
  return normalizeAnnualFolder(unwrapApiData(res));
}

// ─── Evaluation API ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/annual-folders/:folderId/sections/:sectionId/evaluate
 * Evaluates a section with earned points and optional notes.
 */
export async function evaluateSection(
  folderId: string,
  sectionId: string,
  data: { earned_points: number; notes?: string },
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/annual-folders/${folderId}/sections/${sectionId}/evaluate`,
    { method: "POST", body: data },
  );
}

/**
 * POST /api/v1/annual-folders/:folderId/sections/:sectionId/reopen
 * Reopens a previously evaluated section.
 */
export async function reopenSection(
  folderId: string,
  sectionId: string,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/annual-folders/${folderId}/sections/${sectionId}/reopen`,
    { method: "POST" },
  );
}

/**
 * POST /api/v1/annual-folders/:folderId/sections/:sectionId/confirm-union
 * Records the final Union decision for a section pre-approved by LF.
 */
export async function confirmUnionSection(
  folderId: string,
  sectionId: string,
  data: { decision: UnionConfirmationDecision; notes?: string },
): Promise<unknown> {
  return apiRequestFromClient<unknown>(
    `/annual-folders/${folderId}/sections/${sectionId}/confirm-union`,
    { method: "POST", body: data },
  );
}

/**
 * GET /api/v1/annual-folders/:folderId/evaluations
 * Returns all evaluation records for the folder.
 */
export async function getFolderEvaluations(
  folderId: string,
): Promise<SectionEvaluation[]> {
  const res = await apiRequestFromClient<
    SectionEvaluation[] | ApiEnvelope<SectionEvaluation[]>
  >(`/annual-folders/${folderId}/evaluations`);
  return unwrapApiData(res);
}

// ─── Rankings & Award Categories — Types ──────────────────────────────────────

export type AwardCategoryScope = "club" | "section" | "member";

/** Visual tier assigned to an award category — maps to Prisma AwardTier enum (nullable). */
export type AwardTier = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

export type AwardCategory = {
  award_category_id: string;
  name: string;
  description: string | null;
  club_type_id: number | null;
  min_points: number;
  max_points: number | null;
  icon: string | null;
  order: number;
  active: boolean;
  // ── 8.4-A scope (member / section / club categories) ─────────────────────
  scope: AwardCategoryScope;
  // ── 8.4-C extended institutional rankings ─────────────────────────────────
  min_composite_pct: number | null;
  max_composite_pct: number | null;
  is_legacy: boolean;
  // ── 8.4-C Phase C — visual tier ──────────────────────────────────────────
  tier: AwardTier | null;
};

export type ClubRanking = {
  rank_position: number | null;
  club_name: string;
  club_enrollment_id: string;
  ecclesiastical_year_id: number;
  local_field_id: number | null;
  total_earned_points: number;
  total_max_points: number;
  progress_percentage: number;
  award_category_name: string | null;
  // ── Composite scoring (8.4-C extended institutional rankings) ──────────────
  folder_score_pct: number;
  finance_score_pct: number;
  camporee_score_pct: number;
  evidence_score_pct: number;
  composite_score_pct: number;
  composite_calculated_at: string | null;
};

export type RecalculateResult = {
  message: string;
  rankings_updated: number;
};

export type CreateAwardCategoryPayload = Omit<
  AwardCategory,
  "award_category_id" | "active" | "is_legacy"
>;
export type UpdateAwardCategoryPayload = Partial<
  Omit<AwardCategory, "is_legacy">
>;

// ─── Rankings — Server-side ───────────────────────────────────────────────────

/**
 * GET /api/v1/annual-folders/rankings?club_type_id=X&year_id=Y&category_id=Z
 * Returns the ranked clubs list for the given filters.
 */
export async function getRankings(
  clubTypeId: number,
  yearId: number,
  categoryId?: string,
  localFieldId?: number,
): Promise<ClubRanking[]> {
  return apiRequest<ClubRanking[]>("/annual-folders/rankings", {
    params: {
      club_type_id: clubTypeId,
      year_id: yearId,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(localFieldId !== undefined ? { local_field_id: localFieldId } : {}),
    },
  });
}

// ─── Rankings — Client-side ───────────────────────────────────────────────────

/**
 * GET /api/v1/annual-folders/rankings (client-side)
 * For re-fetching after filter changes.
 */
export async function getRankingsFromClient(
  clubTypeId: number,
  yearId: number,
  categoryId?: string,
  localFieldId?: number,
): Promise<ClubRanking[]> {
  return apiRequestFromClient<ClubRanking[]>("/annual-folders/rankings", {
    params: {
      club_type_id: clubTypeId,
      year_id: yearId,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(localFieldId !== undefined ? { local_field_id: localFieldId } : {}),
    },
  });
}

/**
 * POST /api/v1/annual-folders/rankings/recalculate?year_id=Y
 * Triggers recalculation of rankings.
 */
export async function recalculateRankings(
  yearId?: number,
): Promise<RecalculateResult> {
  return apiRequestFromClient<RecalculateResult>(
    "/annual-folders/rankings/recalculate",
    {
      method: "POST",
      params: yearId !== undefined ? { year_id: yearId } : undefined,
    },
  );
}

// ─── Award Categories — Server-side ──────────────────────────────────────────

/**
 * GET /api/v1/award-categories?club_type_id=X&active=true&scope=club|section|member&include_legacy=true
 * Returns the list of award categories.
 */
export async function getAwardCategories(
  clubTypeId?: number,
  active?: boolean,
  scope?: AwardCategoryScope,
  includeLegacy?: boolean,
): Promise<AwardCategory[]> {
  return apiRequest<AwardCategory[]>("/award-categories", {
    params: {
      ...(clubTypeId !== undefined ? { club_type_id: clubTypeId } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(scope !== undefined ? { scope } : {}),
      ...(includeLegacy !== undefined ? { include_legacy: includeLegacy } : {}),
    },
  });
}

/**
 * GET /api/v1/award-categories/:id
 * Returns a single award category.
 */
export async function getAwardCategory(
  categoryId: string,
): Promise<AwardCategory> {
  return apiRequest<AwardCategory>(`/award-categories/${categoryId}`);
}

// ─── Award Categories — Client-side ──────────────────────────────────────────

/**
 * GET /api/v1/award-categories (client-side)
 * For re-fetching. Pass scope to filter by scope, includeLegacy=true to include legacy rows.
 */
export async function getAwardCategoriesFromClient(
  clubTypeId?: number,
  active?: boolean,
  scope?: AwardCategoryScope,
  includeLegacy?: boolean,
): Promise<AwardCategory[]> {
  return apiRequestFromClient<AwardCategory[]>("/award-categories", {
    params: {
      ...(clubTypeId !== undefined ? { club_type_id: clubTypeId } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(scope !== undefined ? { scope } : {}),
      ...(includeLegacy !== undefined ? { include_legacy: includeLegacy } : {}),
    },
  });
}

/**
 * POST /api/v1/award-categories
 * Creates a new award category.
 */
export async function createAwardCategory(
  data: CreateAwardCategoryPayload,
): Promise<AwardCategory> {
  return apiRequestFromClient<AwardCategory>("/award-categories", {
    method: "POST",
    body: data,
  });
}

/**
 * PATCH /api/v1/award-categories/:id
 * Updates an award category.
 */
export async function updateAwardCategory(
  categoryId: string,
  data: UpdateAwardCategoryPayload,
): Promise<AwardCategory> {
  return apiRequestFromClient<AwardCategory>(
    `/award-categories/${categoryId}`,
    {
      method: "PATCH",
      body: data,
    },
  );
}

/**
 * DELETE /api/v1/award-categories/:id
 * Soft-deletes an award category.
 */
export async function deleteAwardCategory(categoryId: string): Promise<void> {
  await apiRequestFromClient<unknown>(`/award-categories/${categoryId}`, {
    method: "DELETE",
  });
}

// ─── Ranking Breakdown ────────────────────────────────────────────────────────

export interface RankingBreakdownComponentFolder {
  score_pct: number;
  earned_points: number;
  max_points: number;
  sections_evaluated: number;
}

export interface RankingBreakdownComponentFinance {
  score_pct: number;
  months_closed_on_time: number;
  months_total: number;
  deadline_day: number;
  missed_months: number[];
}

export interface RankingBreakdownCamporeeEvent {
  id: string;
  name: string;
  status: "approved" | null;
}

export interface RankingBreakdownComponentCamporee {
  score_pct: number;
  attended: number;
  available_in_scope: number;
  events: RankingBreakdownCamporeeEvent[];
}

export interface RankingBreakdownComponentEvidence {
  score_pct: number;
  validated: number;
  rejected: number;
  pending_excluded: number;
}

export interface RankingBreakdownWeightsApplied {
  folder: number;
  finance: number;
  camporee: number;
  evidence: number;
  source: "default" | "club_type_override";
}

export interface RankingBreakdown {
  enrollment_id: string;
  year_id: number;
  composite_score_pct: number;
  weights_applied: RankingBreakdownWeightsApplied;
  components: {
    folder: RankingBreakdownComponentFolder;
    finance: RankingBreakdownComponentFinance;
    camporee: RankingBreakdownComponentCamporee;
    evidence: RankingBreakdownComponentEvidence;
  };
}

/**
 * GET /api/v1/annual-folders/rankings/:enrollmentId/breakdown?year_id=Y
 * Returns the per-component breakdown for a single enrollment's ranking.
 */
export async function fetchRankingBreakdown(
  enrollmentId: string,
  yearId: number,
): Promise<RankingBreakdown> {
  return apiRequest<RankingBreakdown>(
    `/annual-folders/rankings/${enrollmentId}/breakdown`,
    { params: { year_id: yearId } },
  );
}

/**
 * GET /api/v1/annual-folders/rankings/:enrollmentId/breakdown?year_id=Y (client-side)
 * For use in client components.
 */
export async function fetchRankingBreakdownFromClient(
  enrollmentId: string,
  yearId: number,
): Promise<RankingBreakdown> {
  return apiRequestFromClient<RankingBreakdown>(
    `/annual-folders/rankings/${enrollmentId}/breakdown`,
    { params: { year_id: yearId } },
  );
}
