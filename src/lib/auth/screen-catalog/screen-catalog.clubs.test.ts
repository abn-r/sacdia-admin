import { describe, expect, it } from "vitest";

import { buildAuthUser, buildUser } from "@/lib/auth/testing/auth-user-fixture";

import { canCapability, canViewScreen } from "./index";


describe("activities", () => {
  it("lets a permission holder create without a named global role", () => {
    expect(
      canCapability(buildUser(["pastor"], ["activities:create"]), "activities", "create"),
    ).toBe(true);
  });

  it("hides create/update from a reader", () => {
    const reader = buildUser(["director-lf"], ["activities:read"]);
    expect(canViewScreen(reader, "activities")).toBe(true);
    expect(canCapability(reader, "activities", "create")).toBe(false);
    expect(canCapability(reader, "activities", "update")).toBe(false);
    expect(
      canCapability(
        buildUser(["director-lf"], ["activities:update"]),
        "activities",
        "update",
      ),
    ).toBe(true);
  });
});

describe("coordination", () => {
  it("requires coordination:manage AND a class-level GlobalRoles role", () => {
    expect(
      canViewScreen(buildUser(["pastor"], ["coordination:manage"]), "coordination"),
    ).toBe(false);
    expect(canViewScreen(buildUser(["director-lf"], []), "coordination")).toBe(false);
    expect(
      canViewScreen(
        buildUser(["director-lf"], ["coordination:manage"]),
        "coordination",
      ),
    ).toBe(true);
    expect(
      canViewScreen(buildUser(["admin"], ["coordination:manage"]), "coordination"),
    ).toBe(true);
  });

  // assistant-admin is intentionally not asserted on canViewScreen here: the
  // fixture derives users.manage_in_scope without it (viewAny is unchanged).
  it("publishes the write verb to the roles the backend allows", () => {
    for (const role of ["super-admin", "admin", "assistant-admin", "director-lf", "assistant-lf"]) {
      const actor = buildUser([role], ["coordination:manage"]);
      expect(canCapability(actor, "coordination", "manage"), role).toBe(true);
    }
  });

  it("lets union and division read but not write", () => {
    for (const role of ["director-union", "assistant-union", "director-dia", "assistant-dia"]) {
      const actor = buildUser([role], ["coordination:manage"]);
      expect(canViewScreen(actor, "coordination"), role).toBe(true);
      expect(canCapability(actor, "coordination", "manage"), role).toBe(false);
    }
  });

  it("follows the published capability when the backend withholds it", () => {
    const withheld = buildAuthUser({
      roles: ["director-lf"],
      permissions: ["coordination:manage"],
      capabilities: ["users.manage_in_scope"],
    });
    expect(canViewScreen(withheld, "coordination")).toBe(true);
    expect(canCapability(withheld, "coordination", "manage")).toBe(false);
  });
});

describe("clubs create", () => {
  it("lets clubs:create open new and import without a field-leadership role", () => {
    const assistant = buildUser(["assistant-admin"], ["clubs:create"]);
    expect(canCapability(assistant, "clubs", "create")).toBe(true);
    expect(canCapability(assistant, "clubs", "bulk_create")).toBe(true);
  });

  it("hides create/import from director-lf without clubs:create", () => {
    const director = buildUser(["director-lf"], ["clubs:read"]);
    expect(canViewScreen(director, "clubs")).toBe(true);
    expect(canCapability(director, "clubs", "create")).toBe(false);
    expect(canCapability(director, "clubs", "bulk_create")).toBe(false);
  });
});

describe("annual continuations", () => {
  it("lets club_members:approve view and enroll on admin and app", () => {
    const director = buildUser(["director"], ["club_members:approve"]);
    expect(canViewScreen(director, "annual_continuations")).toBe(true);
    expect(canCapability(director, "annual_continuations", "enroll")).toBe(true);
  });

  it("hides enroll without club_members:approve", () => {
    const reader = buildUser(["admin"], ["clubs:read"]);
    expect(canViewScreen(reader, "annual_continuations")).toBe(false);
    expect(canCapability(reader, "annual_continuations", "enroll")).toBe(false);
  });
});

describe("clubs-evidence-folders-templates", () => {
  const screen = "clubs-evidence-folders-templates";

  it("hides delete_draft/delete_section from an admin without annual_folder_templates:delete", () => {
    const admin = buildUser(["admin"], [
      "evidence_folders:read",
      "annual_folder_templates:read",
      "annual_folder_templates:update",
    ]);
    expect(canViewScreen(admin, screen)).toBe(true);
    expect(canCapability(admin, screen, "delete_draft")).toBe(false);
    expect(canCapability(admin, screen, "delete_section")).toBe(false);
  });

  it("shows delete_draft/delete_section with annual_folder_templates:delete", () => {
    const holder = buildUser(["admin"], [
      "evidence_folders:read",
      "annual_folder_templates:delete",
    ]);
    expect(canCapability(holder, screen, "delete_draft")).toBe(true);
    expect(canCapability(holder, screen, "delete_section")).toBe(true);
  });

  it("lets super admin delete drafts", () => {
    const sa = buildUser(["super-admin"], []);
    expect(canCapability(sa, screen, "delete_draft")).toBe(true);
  });
});
