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
  it("collapses the same cargo across sections into one badge without section names", () => {
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

    expect(badges.map((badge) => badge.label)).toEqual(["Director", "Miembro"]);
  });

  it("keeps distinct cargos (deputy, secretary, counselor) as one badge each", () => {
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
      "Subdirector",
      "Secretario",
      "Consejero",
      "Miembro",
    ]);
  });

  it("keeps global roles next to unique club cargos", () => {
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
      "Director de campo local",
      "Miembro",
    ]);
  });

  it("falls back to unique role slugs when club_assignments is missing", () => {
    const badges = toUserListRoleBadges(
      {
        roles: ["director", "member", "director"],
      },
      translate,
    );

    expect(badges.map((badge) => badge.label)).toEqual(["Director", "Miembro"]);
  });

  it("marks a role as pending only when every club assignment with it is pending", () => {
    const badges = toUserListRoleBadges(
      {
        roles: ["director", "member", "counselor"],
        club_assignments: [
          { assignment_id: "d1", role_name: "director", status: "active" },
          { assignment_id: "m1", role_name: "member", status: "pending" },
          { assignment_id: "c1", role_name: "counselor", status: "pending" },
          { assignment_id: "c2", role_name: "counselor", status: "active" },
        ],
      },
      translate,
    );

    expect(badges.map(({ label, pending }) => ({ label, pending }))).toEqual([
      { label: "Director", pending: false },
      { label: "Consejero", pending: false },
      { label: "Miembro", pending: true },
    ]);
  });

  it("never marks global roles or assignments without a status as pending", () => {
    const badges = toUserListRoleBadges(
      {
        roles: ["director-lf", "member"],
        club_assignments: [{ assignment_id: "m", role_name: "member" }],
      },
      translate,
    );

    expect(badges.every((badge) => !badge.pending)).toBe(true);
  });
});
