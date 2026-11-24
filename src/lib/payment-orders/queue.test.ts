import { describe, expect, it } from "vitest";

import type { PaymentOrder } from "@/lib/api/field-payment-orders";
import {
  countOrdersByTab,
  filterOrders,
  oldestReviewWaitDays,
  ordersForTab,
  paginate,
  sortOrdersForTab,
  visiblePaymentOrderTabs,
  waitStart,
  waitingDays,
} from "./queue";

function order(
  id: string,
  status: PaymentOrder["status"],
  createdAt: string,
  extra: Partial<PaymentOrder> = {},
): PaymentOrder {
  return {
    field_payment_order_id: id,
    purpose: "INSURANCE",
    folio_reference: `ORD-${id}`,
    status,
    created_at: createdAt,
    total_centavos: 15000,
    ...extra,
  } as PaymentOrder;
}

const NOW = new Date("2026-11-24T12:00:00.000Z");
const ORDERS = [
  order("a", "PROOF_SUBMITTED", "2026-11-01T00:00:00.000Z"),
  order("b", "PROOF_SUBMITTED", "2026-11-20T00:00:00.000Z", {
    purpose: "CAMPOREE",
  }),
  order("c", "ISSUED", "2026-11-10T00:00:00.000Z"),
  order("d", "PROOF_REJECTED", "2026-11-05T00:00:00.000Z"),
  order("e", "APPROVED", "2026-10-05T00:00:00.000Z"),
];

describe("payment order queue helpers", () => {
  it("shows the payment-orders tabs by what the actor can load", () => {
    expect(
      visiblePaymentOrderTabs({ orders: true, reassignments: true }),
    ).toEqual(["review", "waiting", "rejected", "all", "reassignments"]);
    expect(
      visiblePaymentOrderTabs({ orders: false, reassignments: true }),
    ).toEqual(["reassignments"]);
    expect(
      visiblePaymentOrderTabs({ orders: false, reassignments: false }),
    ).toEqual([]);
  });

  it("splits orders by what has to be done", () => {
    expect(countOrdersByTab(ORDERS)).toEqual({
      review: 2,
      waiting: 1,
      rejected: 1,
      all: 5,
    });
    expect(ordersForTab(ORDERS, "rejected").map((o) => o.field_payment_order_id)).toEqual(["d"]);
  });

  it("measures the wait from the proof upload when known", () => {
    const review = ORDERS[0]!;
    expect(waitStart(review, "2026-11-20T00:00:00.000Z")).toBe(
      "2026-11-20T00:00:00.000Z",
    );
    expect(waitStart(review)).toBe(review.created_at);
    expect(waitStart(ORDERS[4]!)).toBeNull();
    expect(waitingDays("2026-11-20T00:00:00.000Z", NOW)).toBe(4);
    expect(waitingDays(null, NOW)).toBeNull();
  });

  it("reports the oldest wait among orders under review", () => {
    expect(oldestReviewWaitDays(ORDERS, new Map(), NOW)).toBe(23);
    expect(oldestReviewWaitDays([ORDERS[2]!], new Map(), NOW)).toBeNull();
  });

  it("sorts waiting queues oldest first and the rest newest first", () => {
    const ids = (tab: Parameters<typeof sortOrdersForTab>[1]) =>
      sortOrdersForTab(ordersForTab(ORDERS, tab), tab, new Map()).map(
        (o) => o.field_payment_order_id,
      );
    expect(ids("review")).toEqual(["a", "b"]);
    expect(ids("all")).toEqual(["b", "c", "d", "a", "e"]);
  });

  it("filters by purpose and folio", () => {
    expect(
      filterOrders(ORDERS, { purpose: "CAMPOREE", search: "" }).map(
        (o) => o.field_payment_order_id,
      ),
    ).toEqual(["b"]);
    expect(
      filterOrders(ORDERS, { purpose: "ALL", search: " ord-c " }).length,
    ).toBe(1);
  });

  it("paginates and clamps the page", () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    const view = paginate(items, 3, 20);
    expect(view.items).toHaveLength(5);
    expect(view.totalPages).toBe(3);
    expect(paginate(items, 99, 20).page).toBe(3);
    expect(paginate([], 1, 20).totalPages).toBe(1);
  });
});
