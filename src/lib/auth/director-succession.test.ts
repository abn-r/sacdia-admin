import { describe, expect, it } from "vitest";
import {
  canUseDirectorSuccession,
  DIRECTOR_SUCCESSION_ROLES,
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
