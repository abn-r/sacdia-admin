import { BULK_TEMPLATE_HEADERS, type BulkReviewContext } from "@/lib/users/bulk-review";

export type BulkTemplateLabels = {
  /** Header cells of the roles sheet: slug, label, needs a local field. */
  rolesHeader: [string, string, string];
  yes: string;
  /** Header cells of the locations sheet. */
  locationsHeader: [string, string, string];
  sheetUsers: string;
  sheetRoles: string;
  sheetLocations: string;
};

export type BulkTemplateSheets = {
  users: string[][];
  roles: string[][];
  locations: string[][];
};

/**
 * Template with NAMES for union and local field (not catalog numbers), plus
 * reference sheets with the roles and places the actor can use.
 */
export function buildBulkTemplateSheets(
  ctx: BulkReviewContext,
  labels: BulkTemplateLabels,
): BulkTemplateSheets {
  const { catalogs } = ctx;
  const exampleRole = ctx.allowedRoles.includes("user") ? "user" : (ctx.allowedRoles[0] ?? "user");
  const localField = catalogs.localFields[0];
  const union =
    catalogs.unions.find((u) => u.id === localField?.unionId) ?? catalogs.unions[0];
  const country =
    catalogs.countries.find((c) => c.id === union?.countryId) ?? catalogs.countries[0];

  const users = [
    [...BULK_TEMPLATE_HEADERS],
    [
      "ana.ejemplo@correo.test",
      "Ana",
      "Ejemplo",
      "",
      exampleRole,
      country?.name ?? "",
      union?.name ?? "",
      localField?.name ?? "",
    ],
  ];

  const roles: string[][] = [[...labels.rolesHeader]];
  for (const slug of ctx.allowedRoles) {
    roles.push([
      slug,
      ctx.roleLabels[slug] ?? slug,
      ctx.localFieldRequiredRoles.includes(slug) ? labels.yes : "",
    ]);
  }

  const locations: string[][] = [[...labels.locationsHeader]];
  for (const lf of catalogs.localFields) {
    const u = catalogs.unions.find((item) => item.id === lf.unionId);
    const c = catalogs.countries.find((item) => item.id === u?.countryId);
    locations.push([c?.name ?? "", u?.name ?? "", lf.name]);
  }

  return { users, roles, locations };
}
