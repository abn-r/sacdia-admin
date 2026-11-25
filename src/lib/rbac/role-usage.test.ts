import { describe, expect, it } from "vitest";
import { isUsageEndpointMissing, parseRoleUsage, roleUsersHref } from "./role-usage";

describe("parseRoleUsage", () => {
  it("reads the likely shapes of the count", () => {
    expect(parseRoleUsage({ users_count: 9 })).toEqual({ available: true, usersCount: 9 });
    expect(parseRoleUsage({ status: "success", data: { users_count: 0 } })).toEqual({
      available: true,
      usersCount: 0,
    });
    expect(parseRoleUsage({ data: { count: 4 } })).toEqual({ available: true, usersCount: 4 });
    expect(parseRoleUsage(3)).toEqual({ available: true, usersCount: 3 });
  });

  it("reports unavailable for unreadable payloads", () => {
    expect(parseRoleUsage(null)).toEqual({ available: false });
    expect(parseRoleUsage({ users_count: "9" })).toEqual({ available: false });
    expect(parseRoleUsage({ users_count: -1 })).toEqual({ available: false });
  });
});

describe("usage endpoint fallbacks", () => {
  it("treats 404/405/501 as a missing endpoint", () => {
    expect(isUsageEndpointMissing(404)).toBe(true);
    expect(isUsageEndpointMissing(501)).toBe(true);
    expect(isUsageEndpointMissing(500)).toBe(false);
    expect(isUsageEndpointMissing(403)).toBe(false);
  });

  it("links to the users list filtered by role", () => {
    expect(roleUsersHref("club-treasurer")).toBe("/dashboard/users?role=club-treasurer");
  });
});
