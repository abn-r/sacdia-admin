import { describe, expect, it } from "vitest";
import { extractLocalFieldRequiredRoles } from "@/lib/users/assignable-roles";
import type { AuthUser } from "@/lib/auth/types";

function userWith(authorization?: AuthUser["authorization"]): AuthUser {
  return { id: "u1", email: "a@sacdia.test", authorization };
}

describe("extractLocalFieldRequiredRoles", () => {
  it("reads the list published by the backend, normalised and sorted", () => {
    expect(
      extractLocalFieldRequiredRoles(
        userWith({ local_field_required_roles: [" Zeta ", "alpha", "alpha", ""] }),
      ),
    ).toEqual(["alpha", "zeta"]);
  });

  it("treats a missing or malformed field as an empty list", () => {
    expect(extractLocalFieldRequiredRoles(userWith({}))).toEqual([]);
    expect(extractLocalFieldRequiredRoles(userWith())).toEqual([]);
    expect(extractLocalFieldRequiredRoles(null)).toEqual([]);
    expect(
      extractLocalFieldRequiredRoles(
        userWith({ local_field_required_roles: "pastor" as unknown as string[] }),
      ),
    ).toEqual([]);
  });
});
