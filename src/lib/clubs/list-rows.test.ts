import { describe, expect, it } from "vitest";

import { clubLocationLine, clubSectionCounts } from "./list-rows";

const district = (name: string) => `Distrito ${name}`;

describe("clubLocationLine", () => {
  it("joins district and church with a middle dot", () => {
    expect(
      clubLocationLine(
        { name: "Club Orión", district: { name: "Norte" }, church: { name: "Iglesia Central de Valle Alto" } },
        district,
      ),
    ).toBe("Distrito Norte · Iglesia Central de Valle Alto");
  });

  it("skips what the API did not send", () => {
    expect(clubLocationLine({ church: { name: "Iglesia Horizonte" } }, district)).toBe("Iglesia Horizonte");
    expect(clubLocationLine({}, district)).toBe("");
  });
});

describe("clubSectionCounts", () => {
  it("counts active over total sections", () => {
    expect(clubSectionCounts({ club_sections: [{ active: true }, { active: false }, {}] })).toEqual({
      active: 2,
      total: 3,
    });
  });

  it("is null without sections", () => {
    expect(clubSectionCounts({})).toBeNull();
  });
});
