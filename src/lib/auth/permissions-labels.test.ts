import { describe, expect, it } from "vitest";

import {
  getPermissionGroupLabel,
  getPermissionLabel,
  permissionMatchesQuery,
} from "./permissions";

function buildTranslator(messages: Record<string, string>) {
  const t = ((key: string) => messages[key] ?? key) as ((
    key: string,
  ) => string) & { has?: (key: string) => boolean };
  t.has = (key: string) => Object.prototype.hasOwnProperty.call(messages, key);
  return t;
}

describe("getPermissionLabel", () => {
  it("reads literal colon keys from rbac.permissions", () => {
    const t = buildTranslator({
      "permissions.catalogs:read": "Ver catálogos",
    });

    expect(getPermissionLabel(t, "catalogs:read")).toBe("Ver catálogos");
  });

  it("falls back to nested dotted keys", () => {
    const t = buildTranslator({
      "permissions.coordination.manage": "Administrar coordinación",
    });

    expect(getPermissionLabel(t, "coordination:manage")).toBe(
      "Administrar coordinación",
    );
  });

  it("returns the raw key when no translation exists", () => {
    const t = buildTranslator({});
    expect(getPermissionLabel(t, "unknown:read")).toBe("unknown:read");
  });
});

describe("permissionMatchesQuery", () => {
  it("matches Spanish labels, not only the technical key", () => {
    const t = buildTranslator({
      "permissions.catalogs:read": "Ver catálogos",
      "permissionGroups.catalogs": "Catálogos",
    });
    const permission = {
      permission_name: "catalogs:read",
      description: "View catalogs",
    };

    expect(permissionMatchesQuery(t, permission, "catálogos")).toBe(true);
    expect(permissionMatchesQuery(t, permission, "catalogs:read")).toBe(true);
    expect(permissionMatchesQuery(t, permission, "finanzas")).toBe(false);
  });
});

describe("getPermissionGroupLabel", () => {
  it("translates resource prefixes", () => {
    const t = buildTranslator({
      "permissionGroups.insurance": "Seguros",
    });
    expect(getPermissionGroupLabel(t, "insurance")).toBe("Seguros");
  });
});
