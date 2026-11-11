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

  it("hides the Catálogos entry when the user only has catalogs:read (no editor access)", () => {
    const titles = collectTitles(
      filterSidebarItems(
        sidebarItems,
        checker(["director-lf"], ["catalogs:read", "countries:read", "classes:read"]),
      ),
    );

    expect(titles).not.toContain("Catálogos");
  });

  it("shows Catálogos for certifications:configure without catalogs.edit (certifications catalog only)", () => {
    const titles = collectTitles(
      filterSidebarItems(sidebarItems, checker(["director-lf"], ["certifications:configure"])),
    );

    expect(titles).toContain("Catálogos");
  });

  it("shows Catálogos for admin (catalogs.edit) with a catalog read permission", () => {
    const titles = collectTitles(
      filterSidebarItems(sidebarItems, checker(["admin"], ["catalogs:read"])),
    );

    expect(titles).toContain("Catálogos");
  });

  it("shows Configuración when the user can reach one of its links, and hides it otherwise", () => {
    const withRoles = collectTitles(
      filterSidebarItems(sidebarItems, checker([], ["roles:read"])),
    );
    expect(withRoles).toContain("Configuración");

    const without = collectTitles(
      filterSidebarItems(sidebarItems, checker([], ["users:read"])),
    );
    expect(without).not.toContain("Configuración");
    expect(without).not.toContain("Catálogos");
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

    expect(titles).toEqual(["Autorizaciones de investidura"]);
  });

  it("shows a pastor-only reviewer the credential queue too (D7)", () => {
    const titles = collectTitles(
      filterSidebarItems(
        sidebarItems,
        checker(
          ["pastor"],
          ["dashboard:read", "clubs:read", "service_credentials:review"],
          { pastorOnly: true },
        ),
      ),
    );

    expect(titles).toEqual([
      "Autorizaciones de investidura",
      "Constancias de consejería",
    ]);
  });

  it("shows a pastor-only validator the section enrollment queue too", () => {
    const titles = collectTitles(
      filterSidebarItems(
        sidebarItems,
        checker(
          ["pastor"],
          ["dashboard:read", "clubs:read", "club_enrollments:validate"],
          { pastorOnly: true },
        ),
      ),
    );

    expect(titles).toEqual([
      "Autorizaciones de investidura",
      "Inscripciones de sección",
    ]);
  });

  it("keeps the approved structure: 6 groups, daily queues first, max 2 levels", () => {
    expect(sidebarItems.map((group) => group.label)).toEqual([
      undefined,
      "Por atender",
      "Clubes y miembros",
      "Operación",
      "Evaluación y eventos",
      "Administración",
    ]);

    for (const group of sidebarItems) {
      for (const item of group.items) {
        for (const sub of "subItems" in item ? (item.subItems ?? []) : []) {
          expect(sub.subItems, `${item.id} > ${sub.id}`).toBeUndefined();
        }
      }
    }

    const pending = sidebarItems[1]!.items.map((item) => item.id);
    expect(pending).toEqual([
      "requests",
      "validations",
      "investiture-requests",
      "certifications-reviews",
      "service-credentials-review",
      "club-enrollments-review",
    ]);
  });

  it("keeps Clubes and Actividades together in Clubes y miembros", () => {
    const ids = sidebarItems[2]!.items.map((item) => item.id);
    expect(ids).toEqual(["clubs", "users", "coordination", "activities", "notifications"]);
  });

  it("hides everything from a user with no permissions or capabilities", () => {
    expect(filterSidebarItems(sidebarItems, checker([]))).toEqual([]);
  });
});
