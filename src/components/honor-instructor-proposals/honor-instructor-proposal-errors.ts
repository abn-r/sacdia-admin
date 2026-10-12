import { ApiError } from "@/lib/api/client";

/** Backend code -> `honor_instructor_proposals.errors.*` key (doc §4.9). */
const ERROR_KEYS = {
  HONOR_INSTRUCTOR_INVALID: "invalid",
  HONOR_INSTRUCTOR_PROPOSAL_NOT_PENDING: "notPending",
  HONOR_INSTRUCTOR_PROPOSAL_NOT_FOUND: "notFound",
  HONOR_INSTRUCTOR_PROPOSAL_NOT_APPROVED: "notApproved",
  HONOR_INSTRUCTOR_PROPOSAL_FORBIDDEN: "forbidden",
} as const;

export type ProposalErrorKey =
  | (typeof ERROR_KEYS)[keyof typeof ERROR_KEYS]
  | "reasonInvalid"
  | "generic";

export function getProposalErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }
  const payload = error.payload as {
    code?: unknown;
    error?: { code?: unknown };
    errors?: { code?: unknown };
  };
  for (const code of [payload.code, payload.error?.code, payload.errors?.code]) {
    if (typeof code === "string") return code;
  }
  return null;
}

/** The approved instructor can no longer be assigned: only "Reject" remains. */
export function isInstructorInvalidError(error: unknown): boolean {
  return getProposalErrorCode(error) === "HONOR_INSTRUCTOR_INVALID";
}

/**
 * Maps a failed approve/reject to a translation key. Known codes win; otherwise
 * the HTTP status decides (404, 409, 400 on reject = missing or bad reason, 403).
 */
export function getProposalErrorKey(error: unknown): ProposalErrorKey {
  const code = getProposalErrorCode(error);
  if (code && code in ERROR_KEYS) return ERROR_KEYS[code as keyof typeof ERROR_KEYS];
  if (error instanceof ApiError) {
    if (error.status === 404) return "notFound";
    if (error.status === 409) return "notPending";
    if (error.status === 403) return "forbidden";
    if (error.status === 400) return "reasonInvalid";
  }
  return "generic";
}

/** 404 and 409 mean the row is stale: the queue must be reloaded. */
export function isStaleProposalError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 409);
}
