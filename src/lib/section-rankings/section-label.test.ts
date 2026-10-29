import { describe, expect, it } from "vitest";

import { buildSectionMembersHref, buildSectionRankingLabel } from "./section-label";

describe("buildSectionRankingLabel", () => {
  it("joins club and section", () => {
    expect(buildSectionRankingLabel("Guías Mayores", "Club Orión", "Sección")).toBe(
      "Club Orión · Guías Mayores",
    );
  });

  it("shows only the section when the club is unknown or repeats it", () => {
    expect(buildSectionRankingLabel("Guías Mayores", null, "Sección")).toBe("Guías Mayores");
    expect(buildSectionRankingLabel("Orión", "orión", "Sección")).toBe("Orión");
  });

  it("falls back to the club, then to the generic label, never an id", () => {
    expect(buildSectionRankingLabel(null, "Club Orión", "Sección")).toBe("Club Orión");
    expect(buildSectionRankingLabel("  ", undefined, "Sección")).toBe("Sección");
  });
});

describe("buildSectionMembersHref", () => {
  it("carries the year and the display names", () => {
    expect(
      buildSectionMembersHref(5, 3, { sectionName: "Guías Mayores", clubName: "Club Orión" }),
    ).toBe(
      "/dashboard/section-rankings/5/members?year_id=3&section_name=Gu%C3%ADas+Mayores&club_name=Club+Ori%C3%B3n",
    );
  });

  it("omits names that are unknown", () => {
    expect(buildSectionMembersHref(5, 3, {})).toBe(
      "/dashboard/section-rankings/5/members?year_id=3",
    );
  });
});
