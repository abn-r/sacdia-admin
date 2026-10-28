import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/lib/auth/types";

import { canEvaluateMemberOfMonth } from "./evaluate-access";

function buildUser(permissions: string[], assignments: unknown[]): AuthUser {
  return {
    id: "u1",
    email: "u@test.com",
    authorization: {
      grants: { club_assignments: assignments as never },
      effective: { permissions },
    },
  };
}

const assignment = (sectionId: number, roleName: string) => ({
  assignment_id: `a-${sectionId}`,
  role_name: roleName,
  section: { club_section_id: sectionId },
});

describe("canEvaluateMemberOfMonth", () => {
  it("allows a section director holding mom:evaluate", () => {
    const user = buildUser(["mom:evaluate"], [assignment(7, "director")]);
    expect(canEvaluateMemberOfMonth(user, 7)).toBe(true);
  });

  it("denies a supervisor (director-lf / admin) without a club director assignment", () => {
    const user = buildUser(["mom:evaluate", "mom:supervise"], []);
    expect(canEvaluateMemberOfMonth(user, 7)).toBe(false);
  });

  it("denies a director of another section", () => {
    const user = buildUser(["mom:evaluate"], [assignment(8, "director")]);
    expect(canEvaluateMemberOfMonth(user, 7)).toBe(false);
  });

  it("denies non-director club roles and missing permission", () => {
    expect(
      canEvaluateMemberOfMonth(buildUser(["mom:evaluate"], [assignment(7, "secretary")]), 7),
    ).toBe(false);
    expect(
      canEvaluateMemberOfMonth(buildUser([], [assignment(7, "director")]), 7),
    ).toBe(false);
    expect(canEvaluateMemberOfMonth(null, 7)).toBe(false);
  });
});
