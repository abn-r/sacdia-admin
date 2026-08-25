import { ApiError } from "@/lib/api/client";
import { getCamporeeOrderErrorCode } from "@/lib/api/camporee-orders";

type CamporeeOrderErrorKey =
  | "errors.forbidden"
  | "errors.invalidTransition"
  | "errors.makerChecker"
  | "errors.proofNotFound"
  | "errors.rejectReasonRequired"
  | "errors.authorizationReasonRequired"
  | "errors.ordersDisabled"
  | "errors.ordersNotOpen"
  | "errors.ordersClosed"
  | "toasts.actionFailed"
  | "toasts.loadFailed"
  | "toasts.downloadFailed";

type CamporeeOrderTranslator = (key: CamporeeOrderErrorKey) => string;

const CODE_TO_KEY: Record<string, CamporeeOrderErrorKey> = {
  CAMPOREE_ORDER_FORBIDDEN: "errors.forbidden",
  CAMPOREE_ORDER_INVALID_TRANSITION: "errors.invalidTransition",
  CAMPOREE_ORDER_MAKER_CHECKER: "errors.makerChecker",
  CAMPOREE_ORDER_PROOF_NOT_FOUND: "errors.proofNotFound",
  CAMPOREE_ORDER_REJECT_REASON_REQUIRED: "errors.rejectReasonRequired",
  CAMPOREE_ORDER_AUTHORIZATION_REASON_REQUIRED: "errors.authorizationReasonRequired",
  CAMPOREE_ORDERS_DISABLED: "errors.ordersDisabled",
  CAMPOREE_ORDERS_NOT_OPEN: "errors.ordersNotOpen",
  CAMPOREE_ORDERS_CLOSED: "errors.ordersClosed",
};

export function getCamporeeOrderUiErrorMessage(
  error: unknown,
  t: CamporeeOrderTranslator,
  fallbackKey:
    | "toasts.actionFailed"
    | "toasts.loadFailed"
    | "toasts.downloadFailed" = "toasts.actionFailed",
): string {
  const code = getCamporeeOrderErrorCode(error);
  if (code && CODE_TO_KEY[code]) {
    return t(CODE_TO_KEY[code]);
  }

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t("errors.forbidden");
    }
    if (error.message) return error.message;
  }

  return t(fallbackKey);
}
