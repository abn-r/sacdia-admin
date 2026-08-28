import { describe, expect, it } from "vitest";

import type { Role } from "./types";
import {
  activePermissionIds,
  validateCopyRolePermissions,
} from "./copy-role-permissions";

function buildRole(
  overrides: Partial<Role> & Pick<Role, "role_id" | "role_name">,
): Role {
  return {
    role_category: "GLOBAL",
    description: null,
    active: true,
    role_permissions: [],
    ...overrides,
  };
}

describe("validateCopyRolePermissions", () => {
  it("rejects copying onto the same role", () => {
    const role = buildRole({ role_id: "a", role_name: "admin" });
    expect(validateCopyRolePermissions(role, role)).toBe("same_role");
  });

  it("rejects copying from or onto super-admin", () => {
    const source = buildRole({ role_id: "src", role_name: "super-admin" });
    const target = buildRole({ role_id: "dst", role_name: "admin" });
    expect(validateCopyRolePermissions(source, target)).toBe("source_protected");
    expect(validateCopyRolePermissions(target, source)).toBe("target_protected");
  });

  it("allows copying between editable roles", () => {
    const source = buildRole({ role_id: "src", role_name: "director-lf" });
    const target = buildRole({ role_id: "dst", role_name: "assistant-lf" });
    expect(validateCopyRolePermissions(source, target)).toBeNull();
  });
});

describe("activePermissionIds", () => {
  it("keeps only active assignments", () => {
    const role = buildRole({
      role_id: "src",
      role_name: "admin",
      role_permissions: [
        {
          role_permission_id: "1",
          role_id: "src",
          permission_id: "p-active",
          active: true,
          permissions: {
            permission_id: "p-active",
            permission_name: "catalogs:read",
            description: null,
          },
        },
        {
          role_permission_id: "2",
          role_id: "src",
          permission_id: "p-off",
          active: false,
          permissions: {
            permission_id: "p-off",
            permission_name: "catalogs:delete",
            description: null,
          },
        },
      ],
    });

    expect(activePermissionIds(role)).toEqual(["p-active"]);
  });
});
