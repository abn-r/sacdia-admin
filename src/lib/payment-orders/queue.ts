import type {
  PaymentOrder,
  PaymentOrderPurpose,
  PaymentOrderStatus,
} from "@/lib/api/field-payment-orders";

/** Tabs of the payment-orders screen, in display order. */
export const PAYMENT_ORDER_QUEUE_TABS = [
  "review",
  "waiting",
  "rejected",
  "all",
] as const;

export type PaymentOrderQueueTab = (typeof PAYMENT_ORDER_QUEUE_TABS)[number];

export const PAYMENT_ORDER_TAB_IDS = [
  ...PAYMENT_ORDER_QUEUE_TABS,
  "reassignments",
] as const;

export type PaymentOrderTabId = (typeof PAYMENT_ORDER_TAB_IDS)[number];

/** What the actor can load; `reassignments` is a history-only tab. */
export type PaymentOrderTabFlags = {
  orders: boolean;
  reassignments: boolean;
};

export function visiblePaymentOrderTabs(
  flags: PaymentOrderTabFlags,
): PaymentOrderTabId[] {
  return PAYMENT_ORDER_TAB_IDS.filter((id) =>
    id === "reassignments" ? flags.reassignments : flags.orders,
  );
}

/** Orders waiting this many days or more get the waiting time marked. */
export const LONG_WAIT_DAYS = 7;

const TAB_STATUS: Record<
  Exclude<PaymentOrderQueueTab, "all">,
  PaymentOrderStatus
> = {
  review: "PROOF_SUBMITTED",
  waiting: "ISSUED",
  rejected: "PROOF_REJECTED",
};

export function ordersForTab(
  orders: readonly PaymentOrder[],
  tab: PaymentOrderQueueTab,
): PaymentOrder[] {
  return tab === "all"
    ? [...orders]
    : orders.filter((order) => order.status === TAB_STATUS[tab]);
}

export function countOrdersByTab(
  orders: readonly PaymentOrder[],
): Record<PaymentOrderQueueTab, number> {
  return {
    review: ordersForTab(orders, "review").length,
    waiting: ordersForTab(orders, "waiting").length,
    rejected: ordersForTab(orders, "rejected").length,
    all: orders.length,
  };
}

/**
 * ISO date the current wait started: proof upload for orders under review
 * (falls back to issue date), issue date for orders waiting for payment.
 * Other statuses do not wait on anyone, so they return null.
 */
export function waitStart(
  order: PaymentOrder,
  proofSubmittedAt?: string | null,
): string | null {
  if (order.status === "PROOF_SUBMITTED") {
    return proofSubmittedAt ?? order.created_at;
  }
  if (order.status === "ISSUED") return order.created_at;
  return null;
}

export function waitingDays(
  start: string | null,
  now: Date = new Date(),
): number | null {
  if (!start) return null;
  const from = new Date(start).getTime();
  if (Number.isNaN(from)) return null;
  return Math.max(0, Math.floor((now.getTime() - from) / 86_400_000));
}

/** Longest wait among the orders under review (days), or null when none. */
export function oldestReviewWaitDays(
  orders: readonly PaymentOrder[],
  proofDates: ReadonlyMap<string, string>,
  now: Date = new Date(),
): number | null {
  let oldest: number | null = null;
  for (const order of ordersForTab(orders, "review")) {
    const days = waitingDays(
      waitStart(order, proofDates.get(order.field_payment_order_id)),
      now,
    );
    if (days !== null && (oldest === null || days > oldest)) oldest = days;
  }
  return oldest;
}

/** Waiting queues show the oldest first; the rest show the newest first. */
export function sortOrdersForTab(
  orders: readonly PaymentOrder[],
  tab: PaymentOrderQueueTab,
  proofDates: ReadonlyMap<string, string>,
): PaymentOrder[] {
  const time = (order: PaymentOrder) =>
    new Date(
      waitStart(order, proofDates.get(order.field_payment_order_id)) ??
        order.created_at,
    ).getTime();
  const oldestFirst = tab === "review" || tab === "waiting";
  return [...orders].sort((a, b) => (oldestFirst ? time(a) - time(b) : time(b) - time(a)));
}

export function filterOrders(
  orders: readonly PaymentOrder[],
  filters: { purpose: PaymentOrderPurpose | "ALL"; search: string },
): PaymentOrder[] {
  const needle = filters.search.trim().toLowerCase();
  return orders.filter(
    (order) =>
      (filters.purpose === "ALL" || order.purpose === filters.purpose) &&
      (needle === "" || order.folio_reference.toLowerCase().includes(needle)),
  );
}

export function paginate<T>(items: readonly T[], page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * limit;
  return {
    page: current,
    totalPages,
    total: items.length,
    items: items.slice(start, start + limit),
  };
}

export function isPaymentOrderTab(value: string): value is PaymentOrderTabId {
  return (PAYMENT_ORDER_TAB_IDS as readonly string[]).includes(value);
}
