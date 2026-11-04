import { describe, expect, it } from "vitest";

import { PERMISSION_KEYS } from "./generated/permission-keys";
import { GLOBAL_ROLE_NAMES } from "./generated/role-names";
import * as permissions from "./permissions";
import { ALLOWED_ADMIN_ROLES } from "./roles";

const PERMISSION_SHAPE = /^[a-z_-]+:[a-z_-]+$/;

describe("permissions.ts constants", () => {
  const entries = (Object.entries(permissions) as [string, unknown][]).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && PERMISSION_SHAPE.test(entry[1]),
  );

  it("exports permission constants", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("only names keys present in the generated catalog", () => {
    const known = new Set<string>(PERMISSION_KEYS);
    const missing = entries
      .filter(([, value]) => !known.has(value))
      .map(([name, value]) => `${name} = ${value}`);

    expect(missing).toEqual([]);
  });
});

describe("role arrays", () => {
  const known = new Set<string>(GLOBAL_ROLE_NAMES);
  const arrays = {
    INVESTITURE_AUTHORIZER_ROLES: permissions.INVESTITURE_AUTHORIZER_ROLES,
    INVESTITURE_FIELD_CONFIG_ROLES: permissions.INVESTITURE_FIELD_CONFIG_ROLES,
    INVESTITURE_PASTOR_ASSIGN_ROLES: permissions.INVESTITURE_PASTOR_ASSIGN_ROLES,
    ALLOWED_ADMIN_ROLES,
  };

  it.each(Object.entries(arrays))("%s only has global role names", (_n, roles) => {
    expect(roles.filter((role) => !known.has(role))).toEqual([]);
  });
});
