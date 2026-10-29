import { describe, expect, it } from "vitest";

import { readRecalculateOutcome } from "./recalculate-result";

describe("readRecalculateOutcome", () => {
  it("reads the count from the wrapped response", () => {
    expect(
      readRecalculateOutcome({
        status: "accepted",
        data: { message: "Rankings recalculated", queued: false, rankings_updated: 12 },
      }),
    ).toEqual({ kind: "updated", count: 12 });
  });

  it("keeps a zero count", () => {
    expect(readRecalculateOutcome({ data: { rankings_updated: 0 } })).toEqual({
      kind: "updated",
      count: 0,
    });
  });

  it("reads an unwrapped response", () => {
    expect(readRecalculateOutcome({ rankings_updated: 3 })).toEqual({
      kind: "updated",
      count: 3,
    });
  });

  it("reports queued and skipped runs without a count", () => {
    expect(readRecalculateOutcome({ data: { queued: true } })).toEqual({ kind: "queued" });
    expect(
      readRecalculateOutcome({ data: { queued: false, skipped: true, rankings_updated: 0 } }),
    ).toEqual({ kind: "skipped" });
  });

  it("falls back to a generic outcome", () => {
    expect(readRecalculateOutcome(null)).toEqual({ kind: "done" });
    expect(readRecalculateOutcome({ data: {} })).toEqual({ kind: "done" });
  });
});
