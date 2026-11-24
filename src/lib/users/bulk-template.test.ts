import { describe, expect, it } from "vitest";

import { buildBulkTemplateSheets } from "@/lib/users/bulk-template";
import type { BulkReviewContext } from "@/lib/users/bulk-review";

const ctx: BulkReviewContext = {
  allowedRoles: ["coordinator", "user"],
  roleLabels: { coordinator: "Coordinador", user: "Usuario" },
  localFieldRequiredRoles: ["coordinator"],
  catalogs: {
    countries: [{ id: 1, name: "México" }],
    unions: [{ id: 10, name: "Unión Valle Alto", countryId: 1 }],
    localFields: [{ id: 100, name: "Asociación Valle Alto", unionId: 10 }],
  },
};

const labels = {
  rolesHeader: ["slug", "etiqueta", "requiere_campo_local"] as [string, string, string],
  yes: "si",
  locationsHeader: ["País", "Unión", "Campo local"] as [string, string, string],
  sheetUsers: "Usuarios",
  sheetRoles: "Roles",
  sheetLocations: "Ubicaciones",
};

describe("buildBulkTemplateSheets", () => {
  it("asks for names, never catalog numbers", () => {
    const { users } = buildBulkTemplateSheets(ctx, labels);
    expect(users[0]).toEqual([
      "email", "name", "paternal_last_name", "maternal_last_name", "role", "country", "union", "local_field",
    ]);
    expect(users[1]!.slice(5)).toEqual(["México", "Unión Valle Alto", "Asociación Valle Alto"]);
    expect(users.flat().some((cell) => /^\d+$/.test(cell))).toBe(false);
  });

  it("lists only the roles the actor may assign and the places they can use", () => {
    const { roles, locations } = buildBulkTemplateSheets(ctx, labels);
    expect(roles).toEqual([
      ["slug", "etiqueta", "requiere_campo_local"],
      ["coordinator", "Coordinador", "si"],
      ["user", "Usuario", ""],
    ]);
    expect(locations[1]).toEqual(["México", "Unión Valle Alto", "Asociación Valle Alto"]);
  });
});
