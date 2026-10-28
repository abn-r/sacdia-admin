/**
 * `system_config.field_payment_orders_v1`: JSON array of local_field_id with the
 * payment-orders flow enabled (sacdia-backend field-payment-orders-flag.service.ts).
 * In those Local Fields POST /users/:id/insurance answers 409
 * FIELD_PAYMENT_ORDER_LEGACY_DISABLED (insurance.service.ts#createInsurance, checked
 * against the MEMBER's users.local_field_id): coverage is born from the order approval.
 */
export const FIELD_PAYMENT_ORDERS_FLAG_KEY = "field_payment_orders_v1";
export const FIELD_PAYMENT_ORDER_LEGACY_DISABLED = "FIELD_PAYMENT_ORDER_LEGACY_DISABLED";

export function parsePaymentOrdersLocalFieldIds(raw: unknown): number[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === "number" && Number.isInteger(id));
  } catch {
    return [];
  }
}

/** Legacy manual registration is blocked for this Local Field. */
export function isLegacyInsuranceBlocked(
  localFieldId: number | undefined,
  enabledLocalFieldIds: readonly number[],
): boolean {
  return localFieldId !== undefined && enabledLocalFieldIds.includes(localFieldId);
}
