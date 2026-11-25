import { describe, expect, it } from "vitest";
import { parseReportsTab, reportsTabHref } from "./tabs";

describe("parseReportsTab", () => {
  it("accepts the three tabs and falls back to monthly", () => {
    expect(parseReportsTab("quarterly")).toBe("quarterly");
    expect(parseReportsTab("annual")).toBe("annual");
    expect(parseReportsTab("monthly")).toBe("monthly");
    expect(parseReportsTab("nope")).toBe("monthly");
    expect(parseReportsTab(undefined)).toBe("monthly");
    expect(parseReportsTab(["annual", "monthly"])).toBe("annual");
  });
});

describe("reportsTabHref", () => {
  it("keeps the monthly tab out of the URL", () => {
    expect(reportsTabHref("monthly")).toBe("/dashboard/reports");
    expect(reportsTabHref("monthly", { year: "2026" })).toBe("/dashboard/reports?year=2026");
  });

  it("writes the tab first and drops empty values and a stale tab", () => {
    expect(reportsTabHref("quarterly", { tab: "annual", club_id: "4", status: "" })).toBe(
      "/dashboard/reports?tab=quarterly&club_id=4",
    );
  });
});
