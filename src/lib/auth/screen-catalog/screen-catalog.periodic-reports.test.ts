import { describe, expect, it } from "vitest";

import { buildUser } from "@/lib/auth/testing/auth-user-fixture";

import { canCapability, canViewScreen, getScreen } from "./index";

const SCREENS = ["reports-quarterly", "reports-annual"] as const;
const READ = ["reports:read", "reports:update", "reports:download"];

describe.each(SCREENS)("%s (quarterly / annual reports)", (screenId) => {
  it("is gated by the reports.view_periodic capability plus reports:read", () => {
    const viewAny = getScreen(screenId)?.viewAny;
    expect(viewAny?.capability).toBe("reports.view_periodic");
    expect(viewAny?.permissions).toEqual(["reports:read"]);
  });

  it("is visible to territorial actors with reports:read", () => {
    expect(canViewScreen(buildUser(["director-lf"], READ), screenId)).toBe(true);
    expect(canViewScreen(buildUser(["admin"], READ), screenId)).toBe(true);
  });

  it("is hidden from coordinators even though they hold reports:read", () => {
    for (const role of ["coordinator", "zone-coordinator", "general-coordinator"]) {
      expect(canViewScreen(buildUser([role], READ), screenId)).toBe(false);
    }
  });

  it("no longer declares manual-data or finalize verbs", () => {
    const ids = getScreen(screenId)?.capabilities.map((capability) => capability.id);
    expect(ids).toEqual(["generate", "regenerate", "download"]);
  });

  it("offers Recalcular only to global super-admin and admin", () => {
    expect(canCapability(buildUser(["super-admin"], READ), screenId, "regenerate")).toBe(true);
    expect(canCapability(buildUser(["admin"], READ), screenId, "regenerate")).toBe(true);
    expect(canCapability(buildUser(["director-lf"], READ), screenId, "regenerate")).toBe(false);
    expect(canCapability(buildUser(["admin"], ["reports:read"]), screenId, "regenerate")).toBe(false);
  });

  it("keeps generate for reports:update holders", () => {
    expect(canCapability(buildUser(["director-lf"], READ), screenId, "generate")).toBe(true);
    expect(canCapability(buildUser(["director-lf"], ["reports:read"]), screenId, "generate")).toBe(false);
  });
});
