import { describe, expect, it } from "vitest";

import { daysWaiting, isOverdue } from "./queue-age";

describe("queue age", () => {
  const now = new Date("2026-11-24T12:00:00Z");

  it("counts whole days", () => {
    expect(daysWaiting("2026-11-24T08:00:00Z", now)).toBe(0);
    expect(daysWaiting("2026-11-12T12:00:00Z", now)).toBe(12);
  });

  it("returns null for missing or invalid dates", () => {
    expect(daysWaiting(null, now)).toBeNull();
    expect(daysWaiting("nope", now)).toBeNull();
  });

  it("flags 7 days or more", () => {
    expect(isOverdue(6)).toBe(false);
    expect(isOverdue(7)).toBe(true);
    expect(isOverdue(null)).toBe(false);
  });
});
