import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildAuthUser, buildUser } from "@/lib/auth/testing/auth-user-fixture";

import { dumpAppCatalog } from "./dump";
import { canViewScreen } from "./index";


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

describe("supervision app screens", () => {
  const GATES: Record<string, string> = {
    "supervision-hub": "supervision.app_view",
    "supervision-enrollments": "club_enrollments.validate",
    "supervision-folders": "folders.evaluate",
    "supervision-requests": "requests.review_territory",
    "supervision-operations": "analytics.operations_dashboard",
    "supervision-clubs": "clubs.view_territory",
    "supervision-reports": "reports.view_territory",
    "supervision-annual-progress": "annual_progress.view_territory",
    "supervision-union-camporees": "union_camporees.approve_registrations",
    "supervision-union-camporee-approvals": "union_camporees.approve_registrations",
    "supervision-union-camporee-orders": "camporee_orders.configure_offering",
  };

  it("declares the 11 app-only screens gated by exactly one capability each", () => {
    const dumped = dumpAppCatalog().screens;
    for (const [id, capability] of Object.entries(GATES)) {
      const screen = dumped.find((entry) => entry.id === id);
      expect(screen, id).toBeDefined();
      expect(screen?.surfaces, id).toEqual(["app"]);
      expect(screen?.viewAny, id).toEqual({ capability });
    }
    expect(dumped.filter((s) => s.id.startsWith("supervision-"))).toHaveLength(11);
  });

  it("opens the hub for Unión and División, also with an unconfigured territory", () => {
    for (const role of ["director-union", "assistant-union", "director-dia", "assistant-dia"]) {
      expect(canViewScreen(buildUser([role]), "supervision-hub"), role).toBe(true);
    }
    const unconfigured = buildAuthUser({ roles: ["director-dia"], scope: {} });
    expect(canViewScreen(unconfigured, "supervision-hub")).toBe(true);
    expect(canViewScreen(unconfigured, "supervision-folders")).toBe(false);
    expect(canViewScreen(unconfigured, "supervision-reports")).toBe(false);
    expect(canViewScreen(buildUser(["director-lf"]), "supervision-hub")).toBe(false);
  });

  it("keeps the camporee screens away from División", () => {
    const division = buildUser(["director-dia"]);
    expect(canViewScreen(division, "supervision-union-camporees")).toBe(false);
    expect(canViewScreen(division, "supervision-union-camporee-approvals")).toBe(false);
    expect(canViewScreen(division, "supervision-union-camporee-orders")).toBe(false);

    const union = buildUser(["director-union"]);
    expect(canViewScreen(union, "supervision-union-camporees")).toBe(true);
    expect(canViewScreen(union, "supervision-union-camporee-approvals")).toBe(true);
    expect(canViewScreen(union, "supervision-union-camporee-orders")).toBe(true);
  });

  it("gives Unión and División their territorial functions", () => {
    for (const role of ["director-union", "director-dia"]) {
      const user = buildUser([role]);
      for (const id of [
        "supervision-enrollments",
        "supervision-folders",
        "supervision-requests",
        "supervision-operations",
        "supervision-clubs",
        "supervision-reports",
        "supervision-annual-progress",
      ]) {
        expect(canViewScreen(user, id), `${role} ${id}`).toBe(true);
      }
    }
  });
});

describe("app catalog dump", () => {
  it("matches the committed Flutter fixture", () => {
    // Local workspace: ../sacdia-app. CI checks the app repo out and sets SACDIA_APP_DIR.
    const appDir = process.env.SACDIA_APP_DIR ?? "../sacdia-app";
    const fixturePath = resolve(
      process.cwd(),
      appDir,
      "test/fixtures/screen-catalog.snapshot.json",
    );
    expect(existsSync(fixturePath), fixturePath).toBe(true);
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
    expect(dumpAppCatalog()).toEqual(fixture);
  });
});
