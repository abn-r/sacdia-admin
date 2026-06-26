import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

export type CertificateBulkImportBatchStatus =
  | "DRAFT"
  | "READY_TO_SUBMIT"
  | "SUBMITTED"
  | "PARTIALLY_APPROVED"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_CORRECTION";

export type CertificateBulkImportItemStatus =
  | "NEEDS_REVIEW"
  | "READY"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "RESUBMITTED";

export type CertificateBulkImportItemType = "HONOR" | "CLASS";

export type CertificateBulkImportUser = {
  user_id: string;
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  email?: string | null;
};

export type CertificateBulkImportFile = {
  file_id: string;
  batch_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
  ocr_raw_text?: string | null;
};

export type CertificateBulkImportItem = {
  item_id: string;
  batch_id: string;
  item_type: CertificateBulkImportItemType;
  detected_name?: string | null;
  detected_date?: string | null;
  completed_at?: string | null;
  ocr_confidence?: number | null;
  field_confidence?: unknown;
  status: CertificateBulkImportItemStatus;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  applied_entity_type?: string | null;
  applied_entity_id?: number | null;
  honor?: { honor_id: number; name: string } | null;
  class?: { class_id: number; name: string } | null;
};

export type CertificateBulkImportEvent = {
  event_id: string;
  batch_id: string;
  item_id?: string | null;
  action: string;
  performed_by_id?: string | null;
  comment?: string | null;
  payload?: unknown;
  created_at: string;
};

export type CertificateBulkImportBatch = {
  batch_id: string;
  user_id: string;
  local_field_id?: number | null;
  status: CertificateBulkImportBatchStatus;
  raw_ocr_payload?: unknown;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  modified_at?: string | null;
  user?: CertificateBulkImportUser | null;
  files?: CertificateBulkImportFile[];
  items?: CertificateBulkImportItem[];
  events?: CertificateBulkImportEvent[];
};

export type PaginatedCertificateBulkImports = {
  items: CertificateBulkImportBatch[];
  total: number;
  page: number;
  limit: number;
};

export type CertificateBulkImportsQuery = {
  page?: number;
  limit?: number;
};

export type ApproveCertificateBulkImportPayload = {
  comment?: string;
};

export type RejectCertificateBulkImportPayload = {
  reason: string;
};

type ApiEnvelope<T> = { status: string; data: T };

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload && "status" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export async function getPendingCertificateBulkImports(
  query: CertificateBulkImportsQuery = {},
): Promise<PaginatedCertificateBulkImports> {
  const params: Record<string, number | undefined> = {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  };
  const res = await apiRequest<ApiEnvelope<PaginatedCertificateBulkImports>>(
    "/admin/certificate-bulk-imports/pending",
    { params },
  );
  return unwrap(res);
}

export async function getCertificateBulkImportDetail(batchId: string): Promise<CertificateBulkImportBatch> {
  const res = await apiRequest<ApiEnvelope<CertificateBulkImportBatch>>(
    `/admin/certificate-bulk-imports/${batchId}`,
  );
  return unwrap(res);
}

export async function approveCertificateBulkImportBatch(
  batchId: string,
  payload: ApproveCertificateBulkImportPayload = {},
): Promise<CertificateBulkImportBatch> {
  const res = await apiRequestFromClient<ApiEnvelope<CertificateBulkImportBatch>>(
    `/admin/certificate-bulk-imports/${batchId}/approve`,
    { method: "POST", body: payload },
  );
  return unwrap(res);
}

export async function rejectCertificateBulkImportBatch(
  batchId: string,
  payload: RejectCertificateBulkImportPayload,
): Promise<CertificateBulkImportBatch> {
  const res = await apiRequestFromClient<ApiEnvelope<CertificateBulkImportBatch>>(
    `/admin/certificate-bulk-imports/${batchId}/reject`,
    { method: "POST", body: payload },
  );
  return unwrap(res);
}

export async function approveCertificateBulkImportItem(
  batchId: string,
  itemId: string,
  payload: ApproveCertificateBulkImportPayload = {},
): Promise<CertificateBulkImportItem> {
  const res = await apiRequestFromClient<ApiEnvelope<CertificateBulkImportItem>>(
    `/admin/certificate-bulk-imports/${batchId}/items/${itemId}/approve`,
    { method: "POST", body: payload },
  );
  return unwrap(res);
}

export async function rejectCertificateBulkImportItem(
  batchId: string,
  itemId: string,
  payload: RejectCertificateBulkImportPayload,
): Promise<CertificateBulkImportItem> {
  const res = await apiRequestFromClient<ApiEnvelope<CertificateBulkImportItem>>(
    `/admin/certificate-bulk-imports/${batchId}/items/${itemId}/reject`,
    { method: "POST", body: payload },
  );
  return unwrap(res);
}
