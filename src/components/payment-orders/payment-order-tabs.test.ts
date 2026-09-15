import { describe, expect, it } from "vitest";

import { visiblePaymentOrderTabs } from "./payment-order-tabs";

describe("visiblePaymentOrderTabs", () => {
  it("keeps only tabs the actor can load", () => {
    expect(
      visiblePaymentOrderTabs({
        pending: true,
        orders: false,
        reassignments: true,
      }),
    ).toEqual(["pending", "reassignments"]);
  });

  it("returns empty when no tab is allowed", () => {
    expect(
      visiblePaymentOrderTabs({
        pending: false,
        orders: false,
        reassignments: false,
      }),
    ).toEqual([]);
  });
});
