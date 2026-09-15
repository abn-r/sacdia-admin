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

describe("catalogs-domain capabilities", () => {
  it("denies create with catalogs:create but without an editor role", () => {
    const user = buildUser(["director-lf"], ["catalogs:create"]);
    expect(canCapability(user, "catalogs-classes", "create")).toBe(false);
    expect(canCapability(user, "catalogs-allergies", "create")).toBe(false);
  });

  it("denies create with an editor role but without the endpoint permission", () => {
    const user = buildUser(["admin"], ["catalogs:read"]);
    expect(canCapability(user, "catalogs-classes", "create")).toBe(false);
    expect(canCapability(user, "catalogs-class-modules", "create")).toBe(false);
    expect(canCapability(user, "catalogs-finance-categories", "create")).toBe(
      false,
    );
  });

  it("rejects the old classes:manage / class_modules:manage / finance_categories:manage OR", () => {
    const user = buildUser(
      ["admin"],
      ["classes:manage", "class_modules:manage", "finance_categories:manage"],
    );
    expect(canCapability(user, "catalogs-classes", "create")).toBe(false);
    expect(canCapability(user, "catalogs-class-modules", "update")).toBe(false);
    expect(canCapability(user, "catalogs-finance-categories", "delete")).toBe(
      false,
    );
  });

  it("rejects the old allergies:* / activity_types:* OR that the API never accepted", () => {
    const user = buildUser(
      ["admin"],
      ["allergies:create", "activity_types:update", "diseases:delete"],
    );
    expect(canCapability(user, "catalogs-allergies", "create")).toBe(false);
    expect(canCapability(user, "catalogs-activity-types", "update")).toBe(false);
    expect(canCapability(user, "catalogs-diseases", "delete")).toBe(false);
  });

  it("allows catalogs:* verbs for admin and assistant-admin", () => {
    const admin = buildUser(["admin"], ["catalogs:create", "catalogs:update"]);
    expect(canCapability(admin, "catalogs-classes", "create")).toBe(true);
    expect(canCapability(admin, "catalogs-inventory-categories", "update")).toBe(
      true,
    );

    const assistant = buildUser(["assistant-admin"], ["catalogs:create"]);
    expect(canCapability(assistant, "catalogs-medicines", "create")).toBe(true);
    expect(canCapability(assistant, "catalogs-relationship-types", "create")).toBe(
      true,
    );
  });

  it("does not treat catalogs:* as honors or honor-category verbs", () => {
    const user = buildUser(
      ["admin"],
      ["catalogs:create", "catalogs:update", "catalogs:delete", "catalogs:read"],
    );
    expect(canViewScreen(user, "catalogs-honor-categories")).toBe(false);
    expect(canCapability(user, "catalogs-honor-categories", "create")).toBe(false);
    expect(canCapability(user, "catalogs-honors", "create")).toBe(false);
  });

  it("allows honor category and honors verbs only with their own keys", () => {
    const user = buildUser(
      ["admin"],
      [
        "honor_categories:read",
        "honor_categories:create",
        "honor_categories:update",
        "honors:read",
        "honors:create",
      ],
    );
    expect(canViewScreen(user, "catalogs-honor-categories")).toBe(true);
    expect(canCapability(user, "catalogs-honor-categories", "create")).toBe(true);
    expect(canCapability(user, "catalogs-honors", "create")).toBe(true);
    expect(canCapability(user, "catalogs-honors", "delete")).toBe(false);
  });

  it("exposes master honors with honors:* (not master_honors:manage or catalogs:*)", () => {
    const catalogsOnly = buildUser(
      ["admin"],
      ["catalogs:read", "catalogs:create", "catalogs:update", "catalogs:delete"],
    );
    expect(canViewScreen(catalogsOnly, "catalogs-master-honors")).toBe(false);
    expect(canCapability(catalogsOnly, "catalogs-master-honors", "create")).toBe(
      false,
    );

    const deadKey = buildUser(["admin"], ["master_honors:manage"]);
    expect(canViewScreen(deadKey, "catalogs-master-honors")).toBe(false);
    expect(canCapability(deadKey, "catalogs-master-honors", "update")).toBe(
      false,
    );

    const honorsAdmin = buildUser(
      ["admin"],
      ["honors:read", "honors:create", "honors:update", "honors:delete"],
    );
    expect(canViewScreen(honorsAdmin, "catalogs-master-honors")).toBe(true);
    expect(canCapability(honorsAdmin, "catalogs-master-honors", "create")).toBe(
      true,
    );
    expect(canCapability(honorsAdmin, "catalogs-master-honors", "update")).toBe(
      true,
    );
    expect(canCapability(honorsAdmin, "catalogs-master-honors", "delete")).toBe(
      true,
    );
    expect(canViewScreen(honorsAdmin, "catalogs-honors")).toBe(true);

    const noRole = buildUser(["director-lf"], ["honors:read", "honors:create"]);
    expect(canViewScreen(noRole, "catalogs-master-honors")).toBe(false);
  });

  it("hides ecclesiastical year create/delete from admin even with :create/:delete", () => {
    const admin = buildUser(
      ["admin"],
      [
        "ecclesiastical_years:read",
        "ecclesiastical_years:create",
        "ecclesiastical_years:update",
        "ecclesiastical_years:delete",
      ],
    );
    expect(canViewScreen(admin, "catalogs-ecclesiastical-years")).toBe(true);
    expect(canCapability(admin, "catalogs-ecclesiastical-years", "create")).toBe(
      false,
    );
    expect(canCapability(admin, "catalogs-ecclesiastical-years", "update")).toBe(
      true,
    );
    expect(canCapability(admin, "catalogs-ecclesiastical-years", "delete")).toBe(
      false,
    );

    const superAdmin = buildUser(["super-admin"], []);
    expect(
      canCapability(superAdmin, "catalogs-ecclesiastical-years", "create"),
    ).toBe(true);
    expect(
      canCapability(superAdmin, "catalogs-ecclesiastical-years", "delete"),
    ).toBe(true);
  });
});
