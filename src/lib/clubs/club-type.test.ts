import { describe, expect, it } from "vitest";
import {
  findMasterGuidesClubTypeId,
  isMasterGuidesClubType,
} from "@/lib/clubs/club-type";

describe("isMasterGuidesClubType", () => {
  it("matches catalog name, slug, and code without using numeric ids", () => {
    expect(isMasterGuidesClubType({ name: "Guías Mayores" })).toBe(true);
    expect(isMasterGuidesClubType({ name: "Guias Mayores" })).toBe(true);
    expect(isMasterGuidesClubType({ label: "Master Guides" })).toBe(true);
    expect(isMasterGuidesClubType({ slug: "master_guides" })).toBe(true);
    expect(isMasterGuidesClubType({ code: "master_guilds" })).toBe(true);
    expect(isMasterGuidesClubType({ name: "Guides Maîtres" })).toBe(true);
    expect(isMasterGuidesClubType({ name: "Guias Máster" })).toBe(true);
  });

  it("does not treat Aventureros or Conquistadores as Guías Mayores", () => {
    expect(isMasterGuidesClubType({ name: "Aventureros", club_type_id: 3 })).toBe(
      false,
    );
    expect(
      isMasterGuidesClubType({ name: "Conquistadores", slug: "pathfinders" }),
    ).toBe(false);
    expect(isMasterGuidesClubType({ name: "Adventurers" })).toBe(false);
  });
});

describe("findMasterGuidesClubTypeId", () => {
  it("returns the catalog id of Guías Mayores even when it is not 3", () => {
    expect(
      findMasterGuidesClubTypeId([
        { club_type_id: 10, name: "Aventureros" },
        { club_type_id: 99, name: "Guías Mayores" },
        { club_type_id: 11, name: "Conquistadores" },
      ]),
    ).toBe(99);
  });

  it("returns null when the catalog has no Guías Mayores type", () => {
    expect(
      findMasterGuidesClubTypeId([
        { value: 1, label: "Aventureros" },
        { value: 2, label: "Conquistadores" },
      ]),
    ).toBeNull();
  });
});
