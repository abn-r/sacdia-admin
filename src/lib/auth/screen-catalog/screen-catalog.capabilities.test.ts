import { describe, expect, it } from "vitest";

import { CAPABILITY_KEYS } from "@/lib/auth/generated/capability-keys";
import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

import { dumpAppCatalog } from "./dump";
import { canCapability, canViewScreen, SCREEN_CATALOG } from "./index";
import type { CapabilityGate } from "./types";

function gates(): Array<{ where: string; gate: CapabilityGate }> {
  const out: Array<{ where: string; gate: CapabilityGate }> = [];
  for (const screen of SCREEN_CATALOG) {
    out.push({ where: `${screen.id}.viewAny`, gate: screen.viewAny });
    for (const capability of screen.capabilities) {
      out.push({ where: `${screen.id}.${capability.id}`, gate: capability.gate });
    }
  }
  return out;
}

describe("capability gates", () => {
  const known = new Set<string>(CAPABILITY_KEYS);

  it("only names capabilities of the generated catalog", () => {
    const unknown = gates()
      .filter(({ gate }) => gate.capability && !known.has(gate.capability))
      .map(({ where, gate }) => `${where}: ${gate.capability}`);
    expect(unknown).toEqual([]);
  });

  it("never mixes a capability with roles or exactRoles", () => {
    const mixed = gates()
      .filter(
        ({ gate }) =>
          gate.capability && ((gate.roles ?? []).length > 0 || gate.exactRoles === true),
      )
      .map(({ where }) => where);
    expect(mixed).toEqual([]);
  });

  it("has no role-replicating gates left in the catalog", () => {
    const roleGates = gates()
      .filter(({ gate }) => (gate.roles ?? []).length > 0)
      .map(({ where }) => where);
    expect(roleGates).toEqual([]);
  });

  it("dumps capability gates with explicit empty lists for the app", () => {
    const dump = dumpAppCatalog();
    const byId = new Map(dump.screens.map((screen) => [screen.id, screen]));
    expect(byId.get("app-section-investiture")?.viewAny).toEqual({
      permissions: [],
      roles: [],
      capability: "investiture.board",
    });
    expect(byId.get("app-investiture-authorizer")?.viewAny).toEqual({
      permissions: [],
      roles: [],
      capability: "investiture.authorize_requests",
    });
    expect(byId.get("coordinator-hub")?.viewAny).toEqual({
      permissions: [],
      roles: [],
      capability: "coordination.hub_view",
    });
  });
});

describe("capability gates deny when /auth/me publishes no capabilities", () => {
  it("fails closed for a user whose payload predates phase 7", () => {
    const admin = buildAuthUser({ roles: ["admin"], permissions: ["countries:read"], capabilities: [] });
    expect(canViewScreen(admin, "catalogs-countries")).toBe(false);
    expect(canViewScreen(admin, "users")).toBe(false);
    expect(canCapability(admin, "clubs", "designate_director")).toBe(false);
  });

  it("opens the same screens once the capabilities arrive", () => {
    const admin = buildAuthUser({ roles: ["admin"], permissions: ["countries:read", "users:read"] });
    expect(canViewScreen(admin, "catalogs-countries")).toBe(true);
    expect(canViewScreen(admin, "users")).toBe(true);
  });

  it("keeps the evaluator bypass for super-admin", () => {
    expect(canViewScreen(buildAuthUser({ roles: ["super-admin"], capabilities: [] }), "users")).toBe(
      true,
    );
  });
});

describe("club-board capabilities come from the ACTIVE assignment", () => {
  it("opens the section investiture board for the active director only", () => {
    expect(canViewScreen(buildAuthUser({ clubRole: "director" }), "app-section-investiture")).toBe(
      true,
    );
    expect(canViewScreen(buildAuthUser({ clubRole: "counselor" }), "app-section-investiture")).toBe(
      false,
    );
  });
});
