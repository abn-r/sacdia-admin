import { apiRequestFromClient } from "@/lib/api/client";

/**
 * Instructor proposals on already-approved honors (D11, doc §2.7 / §4.9).
 * Reviewer: Campo Local. Endpoints: `admin/honor-instructor-proposals`.
 * Shape verified against backend B9 (`feat/honor-instructor-proposals`): the
 * list answers `{ status, data: { items, total, page, limit } }` and `honor`
 * carries only `{ honor_id, name }`. `category` and the approval date are
 * optional because the API does not send them yet.
 */

export type HonorInstructorProposalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";

/** Statuses the queue can list (`WITHDRAWN` is never shown to the reviewer). */
export type HonorInstructorProposalQueueStatus = Exclude<
  HonorInstructorProposalStatus,
  "WITHDRAWN"
>;

export type HonorInstructorKind = "USER" | "EXTERNAL";

/** Instructor block of §4.2, without signed photo or email. */
export type HonorInstructorSummary = {
  kind: HonorInstructorKind;
  user_id?: string | null;
  display_name: string | null;
};

export type HonorInstructorProposal = {
  proposal_id: string;
  status: HonorInstructorProposalStatus;
  created_at: string;
  honor: {
    honor_id: number;
    name: string;
    category?: { honor_category_id?: number; name: string } | string | null;
    approved_at?: string | null;
  } | null;
  member: { user_id: string; display_name: string } | null;
  /** Approval date of the honor, when the API sends it at the top level. */
  honor_approved_at?: string | null;
  current_instructor: HonorInstructorSummary | null;
  proposed_instructor: HonorInstructorSummary;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
};

export type PaginatedHonorInstructorProposals = {
  items: HonorInstructorProposal[];
  total: number;
  page: number;
  limit: number;
};

export type HonorInstructorProposalsQuery = {
  status?: HonorInstructorProposalQueueStatus;
  page?: number;
  limit?: number;
};

export type RejectHonorInstructorProposalPayload = { reason: string };

type ApiEnvelope<T> = { status: string; data: T };

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in payload && "status" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export async function getHonorInstructorProposals(
  query: HonorInstructorProposalsQuery = {},
): Promise<PaginatedHonorInstructorProposals> {
  const res = await apiRequestFromClient<ApiEnvelope<PaginatedHonorInstructorProposals>>(
    "/admin/honor-instructor-proposals",
    {
      params: {
        status: query.status ?? "PENDING",
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    },
  );
  return unwrap(res);
}

export async function approveHonorInstructorProposal(
  proposalId: string,
): Promise<HonorInstructorProposal> {
  const res = await apiRequestFromClient<ApiEnvelope<HonorInstructorProposal>>(
    `/admin/honor-instructor-proposals/${proposalId}/approve`,
    { method: "POST" },
  );
  return unwrap(res);
}

export async function rejectHonorInstructorProposal(
  proposalId: string,
  payload: RejectHonorInstructorProposalPayload,
): Promise<HonorInstructorProposal> {
  const res = await apiRequestFromClient<ApiEnvelope<HonorInstructorProposal>>(
    `/admin/honor-instructor-proposals/${proposalId}/reject`,
    { method: "POST", body: payload },
  );
  return unwrap(res);
}
