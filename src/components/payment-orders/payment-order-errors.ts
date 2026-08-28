import { ApiError } from "@/lib/api/client";

function extractErrorCode(error: unknown): string | null {
  if (
    !(error instanceof ApiError) ||
    !error.payload ||
    typeof error.payload !== "object"
  ) {
    return null;
  }
  const payload = error.payload as { code?: unknown };
  return typeof payload.code === "string" ? payload.code : null;
}

type PaymentOrderErrorKey =
  | "errors.forbidden"
  | "errors.invalidTransition"
  | "errors.makerChecker"
  | "errors.eligibilityFailed"
  | "errors.proofNotFound"
  | "errors.rejectReasonRequired"
  | "errors.configInvalid"
  | "toasts.actionFailed"
  | "toasts.loadFailed"
  | "toasts.downloadFailed";

type PaymentOrderTranslator = (key: PaymentOrderErrorKey) => string;

export function getPaymentOrderErrorMessage(
  error: unknown,
  t: PaymentOrderTranslator,
  fallbackKey:
    | "toasts.actionFailed"
    | "toasts.loadFailed"
    | "toasts.downloadFailed" = "toasts.actionFailed",
): string {
  switch (extractErrorCode(error)) {
    case "FIELD_PAYMENT_ORDER_FORBIDDEN":
      return t("errors.forbidden");
    case "FIELD_PAYMENT_ORDER_INVALID_TRANSITION":
      return t("errors.invalidTransition");
    case "FIELD_PAYMENT_ORDER_MAKER_CHECKER":
      return t("errors.makerChecker");
    case "FIELD_PAYMENT_ORDER_ELIGIBILITY_FAILED":
      return t("errors.eligibilityFailed");
    case "FIELD_PAYMENT_ORDER_PROOF_NOT_FOUND":
      return t("errors.proofNotFound");
    case "FIELD_PAYMENT_ORDER_REJECT_REASON_REQUIRED":
      return t("errors.rejectReasonRequired");
    case "FIELD_PAYMENT_ORDER_CONFIG_INVALID":
      return t("errors.configInvalid");
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
