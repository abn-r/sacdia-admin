export const PAYMENT_ORDER_TAB_IDS = [
  "pending",
  "orders",
  "reassignments",
] as const;

export type PaymentOrderTabId = (typeof PAYMENT_ORDER_TAB_IDS)[number];

export type PaymentOrderTabFlags = Record<PaymentOrderTabId, boolean>;

export function visiblePaymentOrderTabs(
  flags: PaymentOrderTabFlags,
): PaymentOrderTabId[] {
  return PAYMENT_ORDER_TAB_IDS.filter((id) => flags[id]);
}
