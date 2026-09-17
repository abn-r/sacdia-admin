import { describe, expect, it } from "vitest";

import { toUserListRoleBadges } from "./list-role-badges";

const translate = (role: string | null | undefined) => {
  const labels: Record<string, string> = {
    director: "Director",
    member: "Miembro",
    "deputy-director": "Subdirector",
    secretary: "Secretario",
    counselor: "Consejero",
    "director-lf": "Director de campo local",
  };
  return role ? (labels[role] ?? role) : "";
};

describe("toUserListRoleBadges", () => {
  it("shows one badge per club-section cargo instead of collapsing to unique slugs", () => {
    const badges = toUserListRoleBadges(
      {
        roles: ["director", "member"],
        club_assignments: [
          {
            assignment_id: "a1",
            role_name: "member",
            section_name: "Guías Mayores",
            club_name: "ACV",
          },
          {
            assignment_id: "a2",
            role_name: "director",
            section_name: "Aventureros",
            club_name: "ACV",
          },
          {
            assignment_id: "a3",
            role_name: "director",
            section_name: "Conquistadores",
            club_name: "ACV",
          },
        ],
      },
      translate,
    );

    expect(badges.map((badge) => badge.label)).toEqual([
      "Director · Aventureros",
      "Director · Conquistadores",
      "Miembro · Guías Mayores",
    ]);
  });

  it("keeps deputy, secretary and counselor cargos visible with their section", () => {
    const badges = toUserListRoleBadges(
      {
        roles: ["member", "deputy-director", "secretary", "counselor"],
        club_assignments: [
          {
            assignment_id: "m",
            role_name: "member",
            section_name: "Conquistadores",
          },
          {
            assignment_id: "d",
            role_name: "deputy-director",
            section_name: "Conquistadores",
          },
          {
            assignment_id: "s",
            role_name: "secretary",
            section_name: "Aventureros",
          },
          {
            assignment_id: "c",
            role_name: "counselor",
            section_name: "Guías Mayores",
          },
        ],
      },
      translate,
    );

    expect(badges.map((badge) => badge.label)).toEqual([
      "Subdirector · Conquistadores",
      "Secretario · Aventureros",
      "Consejero · Guías Mayores",
      "Miembro · Conquistadores",
    ]);
  });

  it("appends leftover global roles after club cargos", () => {
    const badges = toUserListRoleBadges(
      {
        roles: ["director-lf", "member"],
        club_assignments: [
          {
            assignment_id: "m",
            role_name: "member",
            section_name: "Aventureros",
          },
        ],
      },
      translate,
    );

    expect(badges.map((badge) => badge.label)).toEqual([
      "Miembro · Aventureros",
      "Director de campo local",
    ]);
  });

  it("falls back to unique role slugs when club_assignments is missing", () => {
    const badges = toUserListRoleBadges(
      {
        roles: ["director", "member"],
      },
      translate,
    );

    expect(badges.map((badge) => badge.label)).toEqual(["Director", "Miembro"]);
  });
});
