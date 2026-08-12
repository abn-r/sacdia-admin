import { ApiError } from "@/lib/api/client";

function extractErrorCode(error: unknown): string | null {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") {
    return null;
  }

  const payload = error.payload as {
    code?: unknown;
    error?: { code?: unknown };
    errors?: { code?: unknown };
  };

  if (typeof payload.code === "string") return payload.code;
  if (typeof payload.error?.code === "string") return payload.error.code;
  if (typeof payload.errors?.code === "string") return payload.errors.code;
  return null;
}

type ReviewErrorKey =
  | "errors.scopeForbidden"
  | "errors.invalidTransition"
  | "errors.concurrentUpdate"
  | "errors.forbidden"
  | "toasts.actionFailed"
  | "toasts.loadFailed"
  | "toasts.detailFailed"
  | "toasts.downloadFailed";

type ReviewTranslator = (key: ReviewErrorKey) => string;

export function getCertificationReviewErrorMessage(
  error: unknown,
  t: ReviewTranslator,
  fallbackKey:
    | "toasts.actionFailed"
    | "toasts.loadFailed"
    | "toasts.detailFailed"
    | "toasts.downloadFailed" = "toasts.actionFailed",
): string {
  const code = extractErrorCode(error);

  switch (code) {
    case "CERT_REVIEW_SCOPE_FORBIDDEN":
      return t("errors.scopeForbidden");
    case "CERT_INVALID_TRANSITION":
      return t("errors.invalidTransition");
    case "CERT_CONCURRENT_UPDATE":
      return t("errors.concurrentUpdate");
    default:
      break;
  }

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t("errors.forbidden");
    }
    if (error.message) return error.message;
  }

  return t(fallbackKey);
}
