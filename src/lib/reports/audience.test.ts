import { describe, expect, it } from "vitest";
import { resolveReportsAudience } from "./audience";

describe("resolveReportsAudience", () => {
  it.each(["all", "division", "union", "local_field"])("gives %s roles the territory view", (level) => {
    expect(resolveReportsAudience({ territoryLevel: level, hasClubContext: false, canSupervise: true })).toBe(
      "territory",
    );
  });

  it("keeps the territory view for a territory role that also has a club", () => {
    expect(resolveReportsAudience({ territoryLevel: "union", hasClubContext: true, canSupervise: true })).toBe(
      "territory",
    );
  });

  it("gives club roles their club", () => {
    expect(resolveReportsAudience({ territoryLevel: "open", hasClubContext: true, canSupervise: false })).toBe(
      "club",
    );
  });

  it("falls back to the scoped list for an open role without a club", () => {
    expect(resolveReportsAudience({ territoryLevel: "open", hasClubContext: false, canSupervise: true })).toBe(
      "territory",
    );
    expect(resolveReportsAudience({ territoryLevel: "open", hasClubContext: false, canSupervise: false })).toBe(
      "none",
    );
  });
});
