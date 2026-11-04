import { describe, expect, it } from "vitest";

import { subjectFromUser } from "@/lib/auth/screen-catalog";
import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

import { filterSidebarItems, type SidebarAccessChecker } from "./filter-sidebar";
import { sidebarItems, type NavGroup } from "./sidebar-items";

function checker(
  roles: string[],
  permissions: string[] = [],
  extra: Partial<SidebarAccessChecker> = {},
): SidebarAccessChecker {
  return { ...subjectFromUser(buildAuthUser({ roles, permissions })), ...extra };
}

function collectTitles(groups: NavGroup[]): string[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => {
      if ("subItems" in item && item.subItems) {
        return item.subItems.flatMap((sub) =>
          sub.subItems?.length ? sub.subItems.map((leaf) => leaf.title) : [sub.title],
        );
      }
      return [item.title];
    }),
  );
}

describe("filterSidebarItems", () => {
  it("keeps only items the user can access", () => {
    const titles = collectTitles(
      filterSidebarItems(sidebarItems, checker(["director-lf"], ["users:read"])),
    );

    expect(titles).toContain("Usuarios");
    expect(titles).not.toContain("Actividades");
  });

  it("returns all items for super-admin", () => {
    const filtered = filterSidebarItems(sidebarItems, checker(["super-admin"]));

    expect(filtered.length).toBe(sidebarItems.length);
  });

  it("hides catalog editors when the user has catalogs:read but not catalogs.edit", () => {
    const titles = collectTitles(
      filterSidebarItems(
        sidebarItems,
        checker(["director-lf"], ["catalogs:read", "countries:read", "classes:read"]),
      ),
    );

    expect(titles).not.toContain("Categorías finanzas");
    expect(titles).not.toContain("Países");
    expect(titles).not.toContain("Clases");
    expect(titles).not.toContain("Certificaciones GM");
  });

  it("keeps the certifications catalog for certifications:configure without catalogs.edit", () => {
    const titles = collectTitles(
      filterSidebarItems(sidebarItems, checker(["director-lf"], ["certifications:configure"])),
    );

    expect(titles).toContain("Certificaciones GM");
  });

  it("keeps catalog editors for admin (catalogs.edit) with catalogs:read", () => {
    const titles = collectTitles(
      filterSidebarItems(sidebarItems, checker(["admin"], ["catalogs:read"])),
    );

    expect(titles).toContain("Categorías finanzas");
  });

  it("requires users.manage_in_scope on top of users:read", () => {
    const coordinator = collectTitles(
      filterSidebarItems(sidebarItems, checker(["coordinator"], ["users:read"])),
    );
    expect(coordinator).not.toContain("Usuarios");

    const field = collectTitles(
      filterSidebarItems(sidebarItems, checker(["director-lf"], ["users:read"])),
    );
    expect(field).toContain("Usuarios");
  });

  it("shows a pastor-only user just the authorization list", () => {
    const titles = collectTitles(
      filterSidebarItems(
        sidebarItems,
        checker(["pastor"], ["dashboard:read", "clubs:read"], { pastorOnly: true }),
      ),
    );

    expect(titles).toEqual(["Autorizaciones"]);
  });

  it("hides everything from a user with no permissions or capabilities", () => {
    expect(filterSidebarItems(sidebarItems, checker([]))).toEqual([]);
  });
});
