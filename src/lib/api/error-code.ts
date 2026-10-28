import type { ApiError } from "@/lib/api/client";

export const ADMIN_USER_SCOPE_MISSING = "ADMIN_USER_SCOPE_MISSING";

/** The backend's machine-readable error code (`payload.code`), if any. */
export function apiErrorCode(error: Pick<ApiError, "payload">): string | undefined {
  const payload = error.payload;
  if (payload && typeof payload === "object" && "code" in payload) {
    const code = (payload as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Plain copy of an ApiError for a Client Component. React serializes an Error
 * instance passed as a prop as a bare Error, so `status` and `payload` are lost
 * on the way from a Server Component.
 */
export type ApiErrorInfo = {
  status: number;
  message: string;
  code?: string;
};

export function toApiErrorInfo(error: ApiError): ApiErrorInfo {
  const code = apiErrorCode(error);
  return { status: error.status, message: error.message, ...(code ? { code } : {}) };
}

/**
 * The account has no territory and no assigned sections, so the API fails
 * closed. Typical case: a coordinator nobody has assigned yet. It is a setup
 * gap, not a server error.
 */
export function isScopeMissingError(error: Pick<ApiErrorInfo, "status" | "code">): boolean {
  return error.status === 403 && error.code === ADMIN_USER_SCOPE_MISSING;
}
