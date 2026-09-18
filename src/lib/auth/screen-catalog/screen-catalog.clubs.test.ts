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
