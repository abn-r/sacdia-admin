import { ApiError } from "@/lib/api/client";
import { getCamporeeSupplyErrorCode } from "@/lib/api/camporee-supplies";

type SupplyErrorKey =
  | "errors.forbidden"
  | "errors.priceLocked"
  | "errors.dayLocked"
  | "errors.bypassReasonRequired"
  | "errors.cutoffInvalid"
  | "errors.overDelivery"
  | "errors.qtyInvalid"
  | "toasts.actionFailed"
  | "toasts.loadFailed";

type SupplyTranslator = (key: SupplyErrorKey) => string;

const CODE_TO_KEY: Record<string, SupplyErrorKey> = {
  CAMPOREE_SUPPLIES_FORBIDDEN: "errors.forbidden",
  CAMPOREE_SUPPLIES_PRICE_LOCKED: "errors.priceLocked",
  CAMPOREE_SUPPLIES_DAY_LOCKED: "errors.dayLocked",
  CAMPOREE_SUPPLIES_BYPASS_REASON_REQUIRED: "errors.bypassReasonRequired",
  CAMPOREE_SUPPLIES_CUTOFF_INVALID: "errors.cutoffInvalid",
  CAMPOREE_SUPPLIES_OVER_DELIVERY: "errors.overDelivery",
  CAMPOREE_SUPPLIES_QTY_INVALID: "errors.qtyInvalid",
};

export function getCamporeeSupplyUiErrorMessage(
  error: unknown,
  t: SupplyTranslator,
  fallbackKey: "toasts.actionFailed" | "toasts.loadFailed" = "toasts.actionFailed",
): string {
  const code = getCamporeeSupplyErrorCode(error);
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
