import { describe, expect, it } from "vitest";

import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

import { canEvaluateMemberOfMonth } from "./evaluate-access";

describe("canEvaluateMemberOfMonth", () => {
  it("allows the active section director holding mom:evaluate", () => {
    const user = buildAuthUser({
      permissions: ["mom:evaluate"],
      clubRole: "director",
      clubSectionId: 7,
    });
    expect(canEvaluateMemberOfMonth(user, 7)).toBe(true);
  });

  it("denies a supervisor (director-lf / admin) without a club director assignment", () => {
    const user = buildAuthUser({
      roles: ["director-lf"],
      permissions: ["mom:evaluate", "mom:supervise"],
    });
    expect(canEvaluateMemberOfMonth(user, 7)).toBe(false);
  });

  it("denies a director of another section", () => {
    const user = buildAuthUser({
      permissions: ["mom:evaluate"],
      clubRole: "director",
      clubSectionId: 8,
    });
    expect(canEvaluateMemberOfMonth(user, 7)).toBe(false);
  });

  it("denies non-director club roles (no club.active_director) and missing permission", () => {
    expect(
      canEvaluateMemberOfMonth(
        buildAuthUser({ permissions: ["mom:evaluate"], clubRole: "secretary", clubSectionId: 7 }),
        7,
      ),
    ).toBe(false);
    expect(
      canEvaluateMemberOfMonth(
        buildAuthUser({ permissions: [], clubRole: "director", clubSectionId: 7 }),
        7,
      ),
    ).toBe(false);
    expect(canEvaluateMemberOfMonth(null, 7)).toBe(false);
  });

  it("denies a director whose payload lacks the capability (backend behind)", () => {
    const user = buildAuthUser({
      permissions: ["mom:evaluate"],
      clubRole: "director",
      clubSectionId: 7,
      capabilities: [],
    });
    expect(canEvaluateMemberOfMonth(user, 7)).toBe(false);
  });
});
