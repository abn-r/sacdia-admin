import { describe, expect, it } from "vitest";

import { resolveClassDetailTab } from "./detail-tabs";

describe("resolveClassDetailTab", () => {
  it("accepts the three tabs", () => {
    expect(resolveClassDetailTab("modules")).toBe("modules");
    expect(resolveClassDetailTab("honors")).toBe("honors");
    expect(resolveClassDetailTab("prerequisites")).toBe("prerequisites");
  });

  it("falls back to modules for missing or unknown values", () => {
    expect(resolveClassDetailTab(undefined)).toBe("modules");
    expect(resolveClassDetailTab("nope")).toBe("modules");
    expect(resolveClassDetailTab(["honors", "modules"])).toBe("honors");
  });
});
