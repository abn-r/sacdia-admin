import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/lib/auth/types";

import { canCapability, canViewScreen, getScreen } from "./index";

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

describe("catalogs geography screens", () => {
  it("requires permission AND catalog-editor role for countries create", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["countries:create"]),
        "catalogs-countries",
        "create",
      ),
    ).toBe(false);
    expect(
      canCapability(buildUser(["admin"], ["countries:read"]), "catalogs-countries", "create"),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["admin"], ["countries:create"]),
        "catalogs-countries",
        "create",
      ),
    ).toBe(true);
  });

  it("rejects the old catalogs:* OR on geography writes", () => {
    const catalogsOnly = buildUser(["admin"], ["catalogs:create", "catalogs:update"]);
    expect(canCapability(catalogsOnly, "catalogs-countries", "create")).toBe(false);
    expect(canCapability(catalogsOnly, "catalogs-unions", "update")).toBe(false);
    expect(canCapability(catalogsOnly, "catalogs-local-fields", "create")).toBe(false);
    expect(canCapability(catalogsOnly, "catalogs-churches", "create")).toBe(false);
    expect(canCapability(catalogsOnly, "catalogs-divisions", "create")).toBe(false);
  });

  it("lets assistant-admin through the admin alias on geography verbs", () => {
    expect(
      canCapability(
        buildUser(["assistant-admin"], ["unions:update"]),
        "catalogs-unions",
        "update",
      ),
    ).toBe(true);
  });

  it("gates districts by local_fields:* (districts:* and catalogs:* are dead)", () => {
    expect(
      canCapability(
        buildUser(["admin"], ["districts:create", "catalogs:create"]),
        "catalogs-districts",
        "create",
      ),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["admin"], ["districts:update"]),
        "catalogs-districts",
        "update",
      ),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["admin"], ["local_fields:update"]),
        "catalogs-districts",
        "create",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["admin"], ["local_fields:update"]),
        "catalogs-districts",
        "update",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["admin"], ["local_fields:delete"]),
        "catalogs-districts",
        "delete",
      ),
    ).toBe(true);
  });

  it("does not treat districts:read as districts viewAny", () => {
    expect(
      canViewScreen(buildUser(["admin"], ["districts:read"]), "catalogs-districts"),
    ).toBe(false);
    expect(
      canViewScreen(buildUser(["admin"], ["local_fields:read"]), "catalogs-districts"),
    ).toBe(true);
  });

  it("does not treat unions:read as divisions viewAny", () => {
    expect(
      canViewScreen(buildUser(["admin"], ["unions:read"]), "catalogs-divisions"),
    ).toBe(false);
    expect(
      canViewScreen(buildUser(["admin"], ["countries:read"]), "catalogs-divisions"),
    ).toBe(true);
  });

  it("keeps club ideals/types create and delete super-admin only", () => {
    const adminCreate = buildUser(["admin"], ["catalogs:create", "catalogs:update"]);
    expect(canCapability(adminCreate, "catalogs-club-ideals", "create")).toBe(false);
    expect(canCapability(adminCreate, "catalogs-club-types", "create")).toBe(false);
    expect(canCapability(adminCreate, "catalogs-club-ideals", "update")).toBe(true);
    expect(canCapability(adminCreate, "catalogs-club-types", "update")).toBe(true);

    const adminDelete = buildUser(["admin"], ["catalogs:delete"]);
    expect(canCapability(adminDelete, "catalogs-club-ideals", "delete")).toBe(false);

    const superAdmin = buildUser(["super-admin"], []);
    expect(canCapability(superAdmin, "catalogs-club-ideals", "create")).toBe(true);
    expect(canCapability(superAdmin, "catalogs-club-types", "delete")).toBe(true);
  });

  it("rejects the old club_ideals:* / club_types:* OR (keys not in the API)", () => {
    expect(
      canCapability(
        buildUser(["admin"], ["club_ideals:create", "club_types:create"]),
        "catalogs-club-ideals",
        "create",
      ),
    ).toBe(false);
    expect(
      canCapability(
        buildUser(["admin"], ["club_types:update"]),
        "catalogs-club-types",
        "update",
      ),
    ).toBe(false);
  });

  it("does not let a field role with catalogs:create mutate club taxonomy", () => {
    expect(
      canCapability(
        buildUser(["director-lf"], ["catalogs:create"]),
        "catalogs-club-ideals",
        "create",
      ),
    ).toBe(false);
  });

  it("declares create/update/delete on every geography screen", () => {
    for (const id of [
      "catalogs-divisions",
      "catalogs-countries",
      "catalogs-unions",
      "catalogs-local-fields",
      "catalogs-districts",
      "catalogs-churches",
      "catalogs-club-ideals",
      "catalogs-club-types",
    ]) {
      const ids = getScreen(id)?.capabilities.map((cap) => cap.id) ?? [];
      expect(ids, id).toEqual(["create", "update", "delete"]);
    }
  });
});
