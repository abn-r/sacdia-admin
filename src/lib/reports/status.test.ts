import { describe, expect, it } from "vitest";
import {
  MONTHLY_STATUS_INTENT,
  MONTHLY_STATUS_NORMAL,
  countPending,
  monthlyFinding,
  monthlyYearOptions,
  parseMonthlyStatus,
} from "./status";

describe("monthly status mapping", () => {
  it("marks only draft and to-send; submitted is the normal state", () => {
    expect(MONTHLY_STATUS_NORMAL).toEqual(["submitted"]);
    expect(MONTHLY_STATUS_INTENT).toEqual({ draft: "warning", generated: "info" });
  });

  it("parses a status from the URL", () => {
    expect(parseMonthlyStatus("generated")).toBe("generated");
    expect(parseMonthlyStatus(["draft"])).toBe("draft");
    expect(parseMonthlyStatus("other")).toBeUndefined();
    expect(parseMonthlyStatus(undefined)).toBeUndefined();
  });
});

describe("countPending and monthlyFinding", () => {
  it("counts drafts and generated reports", () => {
    expect(
      countPending([{ status: "draft" }, { status: "generated" }, { status: "generated" }, { status: "submitted" }]),
    ).toEqual({ drafts: 1, toSend: 2 });
  });

  it("picks the finding from the counts", () => {
    expect(monthlyFinding({ drafts: 0, toSend: 0 })).toEqual({ kind: "clear" });
    expect(monthlyFinding({ drafts: 0, toSend: 3 })).toEqual({ kind: "toSend", toSend: 3 });
    expect(monthlyFinding({ drafts: 2, toSend: 0 })).toEqual({ kind: "drafts", drafts: 2 });
    expect(monthlyFinding({ drafts: 2, toSend: 3 })).toEqual({ kind: "both", toSend: 3, drafts: 2 });
  });
});

describe("monthlyYearOptions", () => {
  it("lists the current year and the four before", () => {
    expect(monthlyYearOptions(2026)).toEqual([2026, 2025, 2024, 2023, 2022]);
  });
});
