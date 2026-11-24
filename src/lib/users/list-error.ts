import type { AdminUsersResult } from "@/lib/api/admin-users";
import type { ErrorStateDetail, ErrorStateKind } from "@/lib/api/error-state";

export type UsersListErrorState = { kind: ErrorStateKind; detail: ErrorStateDetail };

/**
 * `listAdminUsers` turns 401/403/404/405/429/5xx into `endpointAvailable: false`
 * with a coarse state; this maps it to the `ErrorState` kind. `checkedAt` is
 * the moment of the failed attempt.
 */
export function usersListErrorState(
  result: Pick<AdminUsersResult, "endpointState" | "checkedAt">,
): UsersListErrorState {
  const detail: ErrorStateDetail = { at: result.checkedAt };
  switch (result.endpointState) {
    case "forbidden":
      return { kind: "forbidden", detail };
    case "rate-limited":
      return { kind: "rateLimited", detail };
    default:
      return { kind: "error", detail };
  }
}
