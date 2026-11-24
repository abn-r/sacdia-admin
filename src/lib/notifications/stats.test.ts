import { describe, expect, it } from "vitest";
import { summarizeStats } from "./stats";

describe("summarizeStats", () => {
  it("adds the daily rows and derives the delivery rate", () => {
    expect(
      summarizeStats({
        activeTokens: 412,
        inactiveTokens30d: 38,
        dailyDeliveryRate: [
          { date: "2026-11-22", tokens_sent: 90, tokens_failed: 10, success_rate: 0.9 },
          { date: "2026-11-23", tokens_sent: 10, tokens_failed: 0, success_rate: 1 },
        ],
      }),
    ).toEqual({ activeDevices: 412, idleDevices: 38, sent: 100, deliveryRate: 100 / 110 });
  });

  it("has no rate when nothing was sent", () => {
    expect(
      summarizeStats({ activeTokens: 1, inactiveTokens30d: 0, dailyDeliveryRate: [] }).deliveryRate,
    ).toBeNull();
  });
});
