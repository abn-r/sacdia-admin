import { describe, expect, it } from "vitest";
import {
  clubSectionDisplayLabel,
  clubSectionTypeName,
} from "@/lib/clubs/types";

describe("club section display helpers", () => {
  it("prefers catalog type name over a nested alias", () => {
    expect(
      clubSectionTypeName({
        club_types: { name: "Conquistadores" },
        club_type: { name: "Pathfinders" },
      }),
    ).toBe("Conquistadores");
  });

  it("builds the canonical club · type label", () => {
    expect(clubSectionDisplayLabel("Panteras", "Conquistadores")).toBe(
      "Panteras · Conquistadores",
    );
    expect(clubSectionDisplayLabel("Panteras", "  ")).toBe("Panteras");
    expect(clubSectionDisplayLabel(null, "Aventureros")).toBe("Aventureros");
  });
});
