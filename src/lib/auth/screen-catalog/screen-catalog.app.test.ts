import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/lib/auth/types";

import { dumpAppCatalog } from "./dump";
import { canViewScreen } from "./index";

function buildUser(roles: string[], permissions: string[]): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    roles,
    authorization: {
      grants: { global_roles: roles.map((role_name) => ({ role_name })) },
      effective: { permissions },
    },
  };
}

describe("app screens", () => {
  it("opens the coordinator hub with admin/coordinator aliases, not coordination:manage", () => {
    const coordinator = buildUser(["coordinator"], []);
    expect(canViewScreen(coordinator, "coordinator-hub")).toBe(true);
    expect(canViewScreen(coordinator, "coordination")).toBe(false);

    const zone = buildUser(["zone-coordinator"], []);
    expect(canViewScreen(zone, "coordinator-hub")).toBe(true);

    const field = buildUser(["director-lf"], ["coordination:manage"]);
    expect(canViewScreen(field, "coordination")).toBe(true);
    expect(canViewScreen(field, "coordinator-hub")).toBe(true);

    const union = buildUser(["director-union"], []);
    expect(canViewScreen(union, "coordinator-hub")).toBe(false);
  });

  it("opens club-staff tiles without USER_MANAGEMENT_ROLES", () => {
    const counselor = buildUser(
      [],
      ["users:read_detail", "clubs:update", "units:update"],
    );
    expect(canViewScreen(counselor, "app-members")).toBe(true);
    expect(canViewScreen(counselor, "app-club")).toBe(true);
    expect(canViewScreen(counselor, "app-units")).toBe(true);
    expect(canViewScreen(counselor, "users")).toBe(false);
  });

  it("does not treat units:read as the units management shortcut", () => {
    const member = buildUser([], ["units:read"]);
    expect(canViewScreen(member, "app-units")).toBe(false);
  });
});

describe("app catalog dump", () => {
  it("matches the committed Flutter fixture", () => {
    const fixturePath = resolve(
      process.cwd(),
      "../sacdia-app/test/fixtures/screen-catalog.snapshot.json",
    );
    expect(existsSync(fixturePath), fixturePath).toBe(true);
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
    expect(dumpAppCatalog()).toEqual(fixture);
  });
});
