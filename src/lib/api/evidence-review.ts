import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvidenceType = "folder" | "class" | "honor";

export type EvidenceStatus =
  | "PENDING"
  | "SUBMITTED"
  | "VALIDATED"
  | "REJECTED";

export type EvidenceItem = {
  id: number;
  type: EvidenceType;
  status: string;
  member_name: string;
  member_id: string;
  section_name: string;
  file_count: number;
  submitted_at: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
};

export type EvidenceFile = {
  evidence_file_id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_at: string;
};

export type EvidenceDetail = EvidenceItem & {
  files: EvidenceFile[];
  validated_by_name: string | null;
};

export type EvidenceHistoryEntry = {
  action: string;
  performed_by_name: string | null;
  comment: string | null;
  created_at: string;
};

export type PaginatedEvidenceItems = {
  data: EvidenceItem[];
  total: number;
  page: number;
  limit: number;
};

export type BulkEvidenceResult = {
  succeeded: number[];
  failed: { id: number; reason: string }[];
};

// ─── Pending list ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/evidence-review/pending
 * GlobalRolesGuard (admin, coordinator)
 */
export async function getEvidencePending(
  type?: EvidenceType,
  page = 1,
  limit = 50,
): Promise<PaginatedEvidenceItems> {
  const params: Record<string, string | number | boolean | undefined> = { page, limit };
  if (type) params.type = type;

  const res = await apiRequest<{ status: string; data: PaginatedEvidenceItems }>(
    "/evidence-review/pending",
    { params },
  );
  return (res as { data: PaginatedEvidenceItems }).data;
}

// ─── Detail ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/evidence-review/:type/:id
 * Client-side only — called from the detail dialog component.
 */
export async function getEvidenceDetail(
  type: EvidenceType,
  id: number,
): Promise<EvidenceDetail> {
  const res = await apiRequestFromClient<{ status: string; data: EvidenceDetail }>(
    `/evidence-review/${type}/${id}`,
  );
  return (res as { data: EvidenceDetail }).data;
}

// ─── Single approve/reject ────────────────────────────────────────────────────

/**
 * POST /api/v1/evidence-review/:type/:id/approve
 * Client-side only (mutation)
 */
export async function approveEvidence(
  type: EvidenceType,
  id: number,
  comments?: string,
): Promise<{ id: number; type: EvidenceType; status: string }> {
  const res = await apiRequestFromClient<{
    status: string;
    data: { id: number; type: EvidenceType; status: string };
  }>(`/evidence-review/${type}/${id}/approve`, {
    method: "POST",
    body: { comments },
  });
  return (res as { data: { id: number; type: EvidenceType; status: string } }).data;
}

/**
 * POST /api/v1/evidence-review/:type/:id/reject
 * Client-side only (mutation)
 */
export async function rejectEvidence(
  type: EvidenceType,
  id: number,
  reason: string,
): Promise<{ id: number; type: EvidenceType; status: string }> {
  const res = await apiRequestFromClient<{
    status: string;
    data: { id: number; type: EvidenceType; status: string };
  }>(`/evidence-review/${type}/${id}/reject`, {
    method: "POST",
    body: { reason },
  });
  return (res as { data: { id: number; type: EvidenceType; status: string } }).data;
}

// ─── Bulk operations ──────────────────────────────────────────────────────────

/**
 * POST /api/v1/evidence-review/bulk-approve
 * Client-side only (mutation)
 */
export async function bulkApproveEvidence(payload: {
  ids: number[];
  type: EvidenceType;
  comments?: string;
}): Promise<BulkEvidenceResult> {
  const res = await apiRequestFromClient<{
    status: string;
    data: BulkEvidenceResult;
  }>("/evidence-review/bulk-approve", {
    method: "POST",
    body: payload,
  });
  return (res as { data: BulkEvidenceResult }).data;
}

/**
 * POST /api/v1/evidence-review/bulk-reject
 * Client-side only (mutation)
 */
export async function bulkRejectEvidence(payload: {
  ids: number[];
  type: EvidenceType;
  reason: string;
}): Promise<BulkEvidenceResult> {
  const res = await apiRequestFromClient<{
    status: string;
    data: BulkEvidenceResult;
  }>("/evidence-review/bulk-reject", {
    method: "POST",
    body: payload,
  });
  return (res as { data: BulkEvidenceResult }).data;
}

// ─── History ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/evidence-review/:type/:id/history
 */
export async function getEvidenceHistory(
  type: EvidenceType,
  id: number,
): Promise<EvidenceHistoryEntry[]> {
  const res = await apiRequest<{ status: string; data: EvidenceHistoryEntry[] }>(
    `/evidence-review/${type}/${id}/history`,
  );
  return (res as { data: EvidenceHistoryEntry[] }).data ?? [];
}
