import { describe, expect, it } from "vitest";
import type { ClubSectionMember } from "@/lib/api/clubs";
import type { ClubLeadership, LeadershipMember } from "@/lib/api/club-detail";
import {
  clubSectionDisplayLabel,
  clubSectionTypeName,
  getSectionOfficers,
} from "@/lib/clubs/types";

function member(
  overrides: Partial<ClubSectionMember> & Pick<ClubSectionMember, "user_id" | "name" | "role">,
): ClubSectionMember {
  return overrides;
}

function leader(
  overrides: Partial<LeadershipMember> &
    Pick<LeadershipMember, "user_id" | "name" | "role_name" | "section_name">,
): LeadershipMember {
  return {
    assignment_id: `${overrides.user_id}-assignment`,
    paternal_last_name: overrides.paternal_last_name ?? null,
    maternal_last_name: overrides.maternal_last_name ?? null,
    user_image: overrides.user_image ?? null,
    email: null,
    start_date: "2026-01-01",
    ...overrides,
  };
}

const emptyLeadership: ClubLeadership = {
  director: null,
  deputies: [],
  secretaries: [],
  others: [],
};

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

describe("getSectionOfficers", () => {
  it("groups section members by official club role codes", () => {
    const officers = getSectionOfficers(
      [
        member({ user_id: "d1", name: "Ana Director", role: "director" }),
        member({ user_id: "s1", name: "Luis Subdirector", role: "deputy-director" }),
        member({ user_id: "sec1", name: "Marta Secretaria", role: "secretary" }),
        member({ user_id: "t1", name: "Pablo Tesorero", role: "treasurer" }),
        member({ user_id: "c1", name: "Carla Consejera", role: "counselor" }),
        member({ user_id: "c2", name: "Diego Consejero", role: "counselor" }),
        member({ user_id: "m1", name: "Miembro Regular", role: "member" }),
      ],
      emptyLeadership,
      "Aventureros",
    );

    expect(officers.director.map((person) => person.name)).toEqual(["Ana Director"]);
    expect(officers["deputy-director"].map((person) => person.name)).toEqual([
      "Luis Subdirector",
    ]);
    expect(officers.secretary.map((person) => person.name)).toEqual(["Marta Secretaria"]);
    expect(officers["secretary-treasurer"]).toEqual([]);
    expect(officers.treasurer.map((person) => person.name)).toEqual(["Pablo Tesorero"]);
    expect(officers.counselor.map((person) => person.name)).toEqual([
      "Carla Consejera",
      "Diego Consejero",
    ]);
  });

  it("includes secretary-treasurer only when that role is assigned", () => {
    const officers = getSectionOfficers(
      [
        member({
          user_id: "st1",
          name: "Sofia Secretaria Tesorera",
          role: "secretary-treasurer",
        }),
      ],
      emptyLeadership,
      "Conquistadores",
    );

    expect(officers["secretary-treasurer"].map((person) => person.name)).toEqual([
      "Sofia Secretaria Tesorera",
    ]);
    expect(officers.secretary).toEqual([]);
    expect(officers.treasurer).toEqual([]);
  });

  it("falls back to leadership of the same section when members omit a role", () => {
    const officers = getSectionOfficers(
      [],
      {
        director: leader({
          user_id: "d1",
          name: "Abner",
          paternal_last_name: "Reyes",
          role_name: "director",
          section_name: "Aventureros",
        }),
        deputies: [
          leader({
            user_id: "s1",
            name: "Sub",
            role_name: "deputy-director",
            section_name: "Conquistadores",
          }),
        ],
        secretaries: [
          leader({
            user_id: "st1",
            name: "Combo",
            role_name: "secretary-treasurer",
            section_name: "Aventureros",
          }),
        ],
        others: [
          leader({
            user_id: "c1",
            name: "Consejero",
            role_name: "counselor",
            section_name: "Aventureros",
          }),
        ],
      },
      "Aventureros",
    );

    expect(officers.director[0]?.name).toBe("Abner Reyes");
    expect(officers["deputy-director"]).toEqual([]);
    expect(officers["secretary-treasurer"][0]?.name).toBe("Combo");
    expect(officers.counselor[0]?.name).toBe("Consejero");
  });
});
