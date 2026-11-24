import { describe, expect, it } from "vitest";
import { currentReportScope, decodeReportScope, encodeReportScope, reportScopeParams } from "./scope";

describe("report scope", () => {
  it("round-trips a scope id", () => {
    expect(decodeReportScope(encodeReportScope("union", 7))).toEqual({ kind: "union", id: "7" });
    expect(decodeReportScope("club:7")).toBeNull();
    expect(decodeReportScope("union:abc")).toBeNull();
  });

  it("reads the most specific scope from the URL", () => {
    expect(currentReportScope({ division_id: "1", union_id: "2", local_field_id: "3" })).toBe("local_field:3");
    expect(currentReportScope({ division_id: "1", union_id: "2" })).toBe("union:2");
    expect(currentReportScope({ division_id: "1" })).toBe("division:1");
    expect(currentReportScope({})).toBeUndefined();
  });

  it("sets one level and clears the rest", () => {
    expect(reportScopeParams("union:2")).toEqual({
      division_id: undefined,
      union_id: "2",
      local_field_id: undefined,
    });
    expect(reportScopeParams(null)).toEqual({
      division_id: undefined,
      union_id: undefined,
      local_field_id: undefined,
    });
  });
});
