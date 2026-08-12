/**
 * Admin API client for certification review trays (requirements + final/closeout).
 * Backend: GET/POST /certifications/reviews/...
 */
import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type CertificationRequirementStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED";

export type CertificationEnrollmentReviewStatus =
  | "SUBMITTED_FOR_FINAL_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "CERTIFIED"
  | string;

export type TrayItem = {
  progress_id: number;
  enrollment_id: number;
  certification_id: number;
  certification_name: string;
  module_id: number;
  module_name: string;
  section_id: number;
  section_name: string;
  status: CertificationRequirementStatus;
  submitted_at: string | null;
  participant: {
    user_id: string;
    name: string | null;
    paternal_last_name: string | null;
  };
};

export type ReviewComponentView = {
  component_id: number;
  component_type: string;
  label: string;
  required: boolean;
  response: {
    text_value: string | null;
    attestation_confirmed: boolean | null;
    linked_user_honor_id: number | null;
    linked_activity_id: number | null;
  } | null;
  evidences: Array<{
    evidence_id: number;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    upload_status: string;
  }>;
};

export type ReviewHistoryEntry = {
  review_event_id: number;
  event_type: string;
  comment: string | null;
  performed_by_id: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
};

export type RequirementReviewDetail = TrayItem & {
  lock_version: number;
  components: ReviewComponentView[];
  history: ReviewHistoryEntry[];
};

export type SignedDownloadResult = {
  url: string;
  expires_in: number;
  original_filename: string;
  mime_type: string;
};

export type FinalTrayItem = {
  enrollment_id: number;
  certification_id: number;
  certification_name: string;
  status: CertificationEnrollmentReviewStatus;
  submitted_at: string | null;
  participant: {
    user_id: string;
    name: string | null;
    paternal_last_name: string | null;
  };
  closeout_evidence: {
    closeout_evidence_id: number;
    review_status: string;
    upload_status?: string;
    original_filename: string;
    mime_type?: string;
  } | null;
};

export async function getRequirementTray(
  status?: CertificationRequirementStatus,
): Promise<TrayItem[]> {
  const payload = await apiRequest<unknown>("/certifications/reviews/requirements", {
    params: status ? { status } : undefined,
  });
  return unwrapApiData<TrayItem[]>(payload);
}

export async function getRequirementDetail(
  progressId: number,
): Promise<RequirementReviewDetail> {
  const payload = await apiRequest<unknown>(
    `/certifications/reviews/requirements/${progressId}`,
  );
  return unwrapApiData<RequirementReviewDetail>(payload);
}

export async function approveRequirement(
  progressId: number,
  lockVersion: number,
  comment?: string,
) {
  const body: { lock_version: number; comment?: string } = {
    lock_version: lockVersion,
  };
  if (comment) body.comment = comment;

  const payload = await apiRequest<unknown>(
    `/certifications/reviews/requirements/${progressId}/approve`,
    { method: "POST", body },
  );
  return unwrapApiData<{ progress_id: number; status: string }>(payload);
}

export async function requestRequirementChanges(
  progressId: number,
  lockVersion: number,
  comment: string,
) {
  const payload = await apiRequest<unknown>(
    `/certifications/reviews/requirements/${progressId}/request-changes`,
    {
      method: "POST",
      body: { lock_version: lockVersion, comment },
    },
  );
  return unwrapApiData<{ progress_id: number; status: string }>(payload);
}

export async function getRequirementEvidenceDownload(
  progressId: number,
  evidenceId: number,
): Promise<SignedDownloadResult> {
  const payload = await apiRequest<unknown>(
    `/certifications/reviews/requirements/${progressId}/evidences/${evidenceId}/download`,
  );
  return unwrapApiData<SignedDownloadResult>(payload);
}

export async function getFinalTray(): Promise<FinalTrayItem[]> {
  const payload = await apiRequest<unknown>("/certifications/reviews/final");
  return unwrapApiData<FinalTrayItem[]>(payload);
}

export async function approveCloseoutEvidence(enrollmentId: number) {
  const payload = await apiRequest<unknown>(
    `/certifications/reviews/final/${enrollmentId}/approve-closeout-evidence`,
    { method: "POST" },
  );
  return unwrapApiData<{ enrollment_id: number; status: string }>(payload);
}

export async function requestCloseoutChanges(
  enrollmentId: number,
  comment: string,
) {
  const payload = await apiRequest<unknown>(
    `/certifications/reviews/final/${enrollmentId}/request-changes`,
    { method: "POST", body: { comment } },
  );
  return unwrapApiData<{ enrollment_id: number; status: string }>(payload);
}

export async function certify(enrollmentId: number) {
  const payload = await apiRequest<unknown>(
    `/certifications/reviews/final/${enrollmentId}/certify`,
    { method: "POST" },
  );
  return unwrapApiData<{
    enrollment_id: number;
    status: string;
    already_certified?: boolean;
  }>(payload);
}

export async function getCloseoutEvidenceDownload(
  enrollmentId: number,
): Promise<SignedDownloadResult> {
  const payload = await apiRequest<unknown>(
    `/certifications/reviews/final/${enrollmentId}/closeout-evidence/download`,
  );
  return unwrapApiData<SignedDownloadResult>(payload);
}
