"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveHonorInstructorProposal,
  getHonorInstructorProposals,
  rejectHonorInstructorProposal,
  type HonorInstructorProposalsQuery,
} from "@/lib/api/honor-instructor-proposals";

export const HONOR_INSTRUCTOR_PROPOSALS_KEY = ["honor-instructor-proposals"] as const;

export function useHonorInstructorProposals(query: HonorInstructorProposalsQuery) {
  return useQuery({
    queryKey: [...HONOR_INSTRUCTOR_PROPOSALS_KEY, query.status ?? "PENDING", query.page ?? 1, query.limit ?? 20],
    queryFn: () => getHonorInstructorProposals(query),
    placeholderData: keepPreviousData,
  });
}

/** Both mutations reload every queue page, also when the call fails as stale (404/409). */
export function useHonorInstructorProposalMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: HONOR_INSTRUCTOR_PROPOSALS_KEY });

  const approve = useMutation({
    mutationFn: (proposalId: string) => approveHonorInstructorProposal(proposalId),
    onSuccess: refresh,
  });
  const reject = useMutation({
    mutationFn: (vars: { proposalId: string; reason: string }) =>
      rejectHonorInstructorProposal(vars.proposalId, { reason: vars.reason }),
    onSuccess: refresh,
  });

  return { approve, reject, refresh };
}
