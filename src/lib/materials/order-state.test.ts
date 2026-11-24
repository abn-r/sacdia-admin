import { describe, expect, it } from "vitest";
import {
  cancelConsequence,
  daysSince,
  estadoForTab,
  orderNextStep,
  resolveClosedFilter,
  resolveInboxTab,
} from "./order-state";

describe("resolveInboxTab", () => {
  const all = ["review", "receipts", "deliver", "closed"] as const;

  it("keeps a valid tab", () => {
    expect(resolveInboxTab("deliver", all)).toBe("deliver");
  });

  it("falls back to the first available tab when the requested one is hidden", () => {
    expect(resolveInboxTab("receipts", ["review", "deliver", "closed"])).toBe("review");
    expect(resolveInboxTab(undefined, ["receipts"])).toBe("receipts");
  });

  it("returns null when no tab is available", () => {
    expect(resolveInboxTab("review", [])).toBeNull();
  });
});

describe("estadoForTab", () => {
  it("maps each step to the estado it lists", () => {
    expect(estadoForTab("review", "entregada")).toBe("en_revision");
    expect(estadoForTab("receipts", "entregada")).toBe("aprobada");
    expect(estadoForTab("deliver", "entregada")).toBe("pagada");
    expect(estadoForTab("closed", "cancelada")).toBe("cancelada");
  });

  it("defaults the closed filter to delivered", () => {
    expect(resolveClosedFilter(undefined)).toBe("entregada");
    expect(resolveClosedFilter("cancelada")).toBe("cancelada");
    expect(resolveClosedFilter("pagada")).toBe("entregada");
  });
});

describe("orderNextStep", () => {
  const base = { linesTotal: 4, linesResolved: 2, pendingReceipts: 0 };

  it("asks for the lines that are still pending while in review", () => {
    expect(orderNextStep({ ...base, estado: "en_revision" })).toEqual({ key: "resolveLines", count: 2 });
  });

  it("is ready to approve once every line has availability", () => {
    expect(orderNextStep({ ...base, linesResolved: 4, estado: "en_revision" })).toEqual({ key: "readyToApprove" });
  });

  it("waits for a receipt, or for its confirmation when one is uploaded", () => {
    expect(orderNextStep({ ...base, estado: "aprobada" })).toEqual({ key: "awaitingReceipt" });
    expect(orderNextStep({ ...base, estado: "aprobada", pendingReceipts: 1 })).toEqual({
      key: "receiptToConfirm",
      count: 1,
    });
  });

  it("covers the paid and closed states", () => {
    expect(orderNextStep({ ...base, estado: "pagada" }).key).toBe("readyToDeliver");
    expect(orderNextStep({ ...base, estado: "entregada" }).key).toBe("delivered");
    expect(orderNextStep({ ...base, estado: "cancelada" }).key).toBe("cancelled");
  });
});

describe("cancelConsequence", () => {
  it("explains what cancelling does in each open state", () => {
    expect(cancelConsequence("en_revision")).toBe("close");
    expect(cancelConsequence("aprobada")).toBe("restoreStock");
    expect(cancelConsequence("pagada")).toBe("refund");
  });

  it("is null once the order is closed", () => {
    expect(cancelConsequence("entregada")).toBeNull();
    expect(cancelConsequence("cancelada")).toBeNull();
  });
});

describe("daysSince", () => {
  it("counts whole days and never goes negative", () => {
    const now = Date.parse("2026-11-24T12:00:00Z");
    expect(daysSince("2026-11-22T10:00:00Z", now)).toBe(2);
    expect(daysSince("2026-11-24T08:00:00Z", now)).toBe(0);
    expect(daysSince("2026-11-26T00:00:00Z", now)).toBe(0);
    expect(daysSince("nope", now)).toBe(0);
  });
});
