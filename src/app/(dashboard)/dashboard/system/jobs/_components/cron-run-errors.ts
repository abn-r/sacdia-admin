import { ApiError } from "@/lib/api/client";

/**
 * Backend error code -> `system_jobs.cronRuns.*` translation key for the
 * run-now action. Errors are resolved by `code` (or HTTP status) only; the
 * backend `details` / `message` are never surfaced to the user.
 */
export const CRON_RUN_ERROR_KEYS = {
  CRON_JOB_NOT_FOUND: "runErrorNotFound",
} as const;

export type CronRunErrorKey =
  | (typeof CRON_RUN_ERROR_KEYS)[keyof typeof CRON_RUN_ERROR_KEYS]
  | "runErrorForbidden"
  | "runErrorGeneric";

function extractErrorCode(error: ApiError): string | undefined {
  const payload = error.payload;
  if (!payload || typeof payload !== "object") return undefined;
  const root = payload as { code?: unknown; error?: { code?: unknown } };
  if (typeof root.code === "string" && root.code.trim()) return root.code;
  const nested = root.error?.code;
  if (typeof nested === "string" && nested.trim()) return nested;
  return undefined;
}

export function getCronRunErrorKey(error: unknown): CronRunErrorKey {
  if (!(error instanceof ApiError)) return "runErrorGeneric";

  const code = extractErrorCode(error);
  if (code && code in CRON_RUN_ERROR_KEYS) {
    return CRON_RUN_ERROR_KEYS[code as keyof typeof CRON_RUN_ERROR_KEYS];
  }
  if (error.status === 403) return "runErrorForbidden";
  return "runErrorGeneric";
}

/** Delay before refreshing the runs after a request cut while the job keeps running. */
export const DETACHED_REFRESH_DELAY_MS = 15_000;

/**
 * True when the HTTP request was lost (network error, proxy/gateway timeout)
 * but the awaited run most likely keeps going on the server. A real 500 with a
 * response body is a genuine failure and is not covered here.
 */
export function isRunDetachedError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 408 || error.status === 502 || error.status === 504) return true;
  // The API client reports "no response at all" as status 500 with no payload.
  return error.status === 500 && error.payload == null;
}
