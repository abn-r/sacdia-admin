import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/lib/auth/types";

import { canCapability, canViewScreen } from "./index";

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

describe("notifications-hub", () => {
  it("opens the hub with any of the three send keys", () => {
    expect(
      canViewScreen(buildUser(["director-lf"], ["notifications:send"]), "notifications-hub"),
    ).toBe(true);
    expect(
      canViewScreen(
        buildUser(["director-lf"], ["notifications:broadcast"]),
        "notifications-hub",
      ),
    ).toBe(true);
    expect(
      canViewScreen(buildUser(["director-lf"], ["notifications:club"]), "notifications-hub"),
    ).toBe(true);
    expect(canViewScreen(buildUser(["director-lf"], ["users:read"]), "notifications-hub")).toBe(
      false,
    );
  });

  it("gates compose verbs on their own keys", () => {
    const direct = buildUser(["director-lf"], ["notifications:send"]);
    expect(canCapability(direct, "notifications-hub", "send_direct")).toBe(true);
    expect(canCapability(direct, "notifications-hub", "broadcast")).toBe(false);
    expect(canCapability(direct, "notifications-hub", "send_club")).toBe(false);

    expect(
      canCapability(
        buildUser(["admin"], ["notifications:broadcast"]),
        "notifications-hub",
        "broadcast",
      ),
    ).toBe(true);
    expect(
      canCapability(
        buildUser(["admin"], ["notifications:club"]),
        "notifications-hub",
        "send_club",
      ),
    ).toBe(true);
  });
});
