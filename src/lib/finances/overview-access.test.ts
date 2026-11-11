import { describe, expect, it } from "vitest";

import { buildAuthUser, buildUser } from "@/lib/auth/testing/auth-user-fixture";

import { canViewFinancesOverview } from "./overview-access";

describe("canViewFinancesOverview", () => {
  it("allows territorial and platform roles with finances:read", () => {
    for (const role of ["director-lf", "assistant-lf", "director-union", "director-dia", "admin", "super-admin"]) {
      expect(canViewFinancesOverview(buildUser([role], ["finances:read"]))).toBe(true);
    }
  });

  it("hides it from club-only roles (the API answers 403)", () => {
    expect(canViewFinancesOverview(buildUser(["user"], ["finances:read"]))).toBe(false);
    expect(canViewFinancesOverview(buildUser(["pastor"], ["finances:read"]))).toBe(false);
  });

  it("hides it without finances:read", () => {
    expect(canViewFinancesOverview(buildUser(["director-lf"], []))).toBe(false);
  });

  it("hides it for unconfigured territorial accounts and anonymous users", () => {
    expect(
      canViewFinancesOverview(buildAuthUser({ roles: ["director-lf"], permissions: ["finances:read"], scope: {} })),
    ).toBe(false);
    expect(canViewFinancesOverview(null)).toBe(false);
  });
});
