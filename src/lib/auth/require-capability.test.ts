import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

const mockRequireAdminUser = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireAdminUser: () => mockRequireAdminUser(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => (key: string) => `t:${key}`),
}));

import { requireCapability } from "./require-capability";

describe("requireCapability", () => {
  beforeEach(() => {
    mockRequireAdminUser.mockReset();
  });

  it("returns the session user when the capability gate passes", async () => {
    const user = buildAuthUser({ roles: ["director-lf"], permissions: ["club_roles:assign"] });
    mockRequireAdminUser.mockResolvedValue(user);

    const gate = await requireCapability("clubs", "designate_director");
    expect(gate.ok).toBe(true);
    expect(gate.user).toBe(user);
  });

  it("returns the translated forbidden error when the gate fails", async () => {
    const user = buildAuthUser({ roles: ["director-union"], permissions: ["club_roles:assign"] });
    mockRequireAdminUser.mockResolvedValue(user);

    const gate = await requireCapability("clubs", "designate_director");
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.error).toBe("t:forbidden");
      expect(gate.screenId).toBe("clubs");
      expect(gate.capabilityId).toBe("designate_director");
    }
  });

  it("fails closed for an unknown capability id", async () => {
    mockRequireAdminUser.mockResolvedValue(buildAuthUser({ roles: ["super-admin"] }));
    const gate = await requireCapability("clubs", "does_not_exist");
    expect(gate.ok).toBe(false);
  });

  it("denies when /auth/me publishes no capabilities yet", async () => {
    mockRequireAdminUser.mockResolvedValue(
      buildAuthUser({ roles: ["admin"], permissions: ["achievements:manage"], capabilities: [] }),
    );
    const gate = await requireCapability("admin-system-achievements", "manage");
    expect(gate.ok).toBe(false);
  });
});
