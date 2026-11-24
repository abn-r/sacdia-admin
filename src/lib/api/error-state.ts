import { ApiError } from "@/lib/api/client";
import { classifyActionError } from "@/lib/api/action-error";

export type ErrorStateKind =
  | "error"
  | "forbidden"
  | "offline"
  | "rateLimited"
  | "notFound";

export type ErrorStateDetail = {
  code?: string | number;
  at?: Date | string;
  ref?: string;
};

export type ErrorStateFromError = {
  kind: ErrorStateKind;
  detail?: ErrorStateDetail;
};

function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 0;
  // fetch() rejects with a TypeError when the network is unreachable.
  return error instanceof TypeError;
}

/**
 * Maps a failed request to the `ErrorState` props: 401/403 forbidden, 404
 * notFound, 429 rateLimited, network failures (TypeError or status 0) offline,
 * anything else a generic error carrying `{ code: status, at: now }`.
 */
export function errorStateFromError(error: unknown): ErrorStateFromError {
  if (isNetworkError(error)) return { kind: "offline" };

  const { kind, status } = classifyActionError(error);
  switch (kind) {
    case "unauthenticated":
    case "forbidden":
      return { kind: "forbidden" };
    case "not_found":
      return { kind: "notFound" };
    case "rate_limited":
      return { kind: "rateLimited" };
    default:
      return {
        kind: "error",
        detail: {
          ...(status !== null ? { code: status } : {}),
          at: new Date(),
        },
      };
  }
}
