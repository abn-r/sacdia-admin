import { describe, expect, it } from "vitest";
import { legacyReportsRedirect } from "./redirects";

describe("legacyReportsRedirect", () => {
  it("sends supervision to the monthly tab keeping its filters", () => {
    expect(legacyReportsRedirect("monthly", { year: "2025", status: "draft", page: "2" })).toBe(
      "/dashboard/reports?year=2025&status=draft&page=2",
    );
  });

  it("sends quarterly and annual to their tab", () => {
    expect(legacyReportsRedirect("quarterly", { club_id: "4" })).toBe("/dashboard/reports?tab=quarterly&club_id=4");
    expect(legacyReportsRedirect("annual", {})).toBe("/dashboard/reports?tab=annual");
  });
});
