import { describe, expect, it } from "vitest";
import {
  canUseDirectorSuccession,
  DIRECTOR_SUCCESSION_ROLES,
  canDesignateNextDirector,
  DIRECTOR_DESIGNATION_ROLES,
} from "@/lib/auth/director-succession";

describe("canUseDirectorSuccession", () => {
  it.each(DIRECTOR_SUCCESSION_ROLES)(
    "allows %s to use director succession",
    (role) => {
      expect(canUseDirectorSuccession([role])).toBe(true);
    },
  );

  it("rejects unrelated roles", () => {
    expect(canUseDirectorSuccession(["coordinator", "member"])).toBe(false);
  });

  it("normalizes role casing and whitespace", () => {
    expect(canUseDirectorSuccession([" ADMIN "])).toBe(true);
  });
});

describe("canDesignateNextDirector", () => {
  it.each(DIRECTOR_DESIGNATION_ROLES)(
    "allows %s to designate next director",
    (role) => {
      expect(canDesignateNextDirector([role])).toBe(true);
    },
  );

  it("rejects unrelated roles", () => {
    expect(canDesignateNextDirector(["coordinator", "member"])).toBe(false);
  });

  it("normalizes role casing and whitespace", () => {
    expect(canDesignateNextDirector([" DIRECTOR-LF "])).toBe(true);
  });

  it("has the same roles as canUseDirectorSuccession", () => {
    // Ensure parity: same set of roles for both operations
    const successionRoles = new Set(DIRECTOR_SUCCESSION_ROLES);
    const designationRoles = new Set(DIRECTOR_DESIGNATION_ROLES);
    expect(successionRoles).toEqual(designationRoles);
  });
});
