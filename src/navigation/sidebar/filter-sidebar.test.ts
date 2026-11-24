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

    expect(titles).toEqual(["Investiduras"]);
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

    expect(titles).toEqual(["Investiduras", "Constancias de consejería"]);
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

    expect(titles).toEqual(["Registros anuales", "Investiduras"]);
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
      "validations-investitures",
      "investiture-requests",
      "certificates",
      "clubs-evidence-folders-list",
    ]);
  });

  it("keeps Clubes and Actividades together in Clubes y miembros", () => {
    const ids = sidebarItems[2]!.items.map((item) => item.id);
    expect(ids).toEqual(["clubs", "activities", "users", "coordination", "notifications"]);
  });

  it("lists every leaf of the approved structure under its approved parent", () => {
    const subs = (groupIndex: number, parentId: string) => {
      const parent = sidebarItems[groupIndex]!.items.find((item) => item.id === parentId);
      return parent && "subItems" in parent ? parent.subItems?.map((sub) => sub.id) : undefined;
    };

    expect(subs(1, "requests")).toEqual([
      "requests-transfers",
      "requests-assignments",
      "requests-membership",
      "club-enrollments-review",
    ]);
    expect(subs(1, "certificates")).toEqual([
      "certificate-bulk-imports",
      "institutional-certificate-requests",
      "certifications-reviews",
      "service-credentials-review",
    ]);
    expect(subs(4, "annual-folders")).toEqual([
      "annual-folders-rankings",
      "annual-folders-ranking-config",
    ]);
    expect(subs(4, "campamentos")?.slice(0, 2)).toEqual([
      "campamentos-list-local",
      "campamentos-list-union",
    ]);
    expect(sidebarItems[3]!.items.map((item) => item.id).slice(0, 3)).toEqual([
      "finances",
      "payment-orders",
      "club-inventory",
    ]);
    expect(sidebarItems[5]!.items.map((item) => item.id)).toEqual([
      "admin-catalogs",
      "admin-settings",
      "admin-system-roles",
      "admin-system-audit",
      "admin-system-jobs",
    ]);
  });

  it("no longer lists Requisitos de cargos or the redirect-only annual folder pages", () => {
    const all = JSON.stringify(sidebarItems.map((group) => group.items.map((i) => i.id)));
    expect(all).not.toContain("role-requirements");
    expect(all).not.toContain("annual-folders-evaluate");
    expect(all).not.toContain("annual-folders-templates");
    expect(all).not.toContain("annual-folders-categories");
  });

  it("shows the roles, audit and system entries to the user who can reach each page", () => {
    const admin = collectTitles(
      filterSidebarItems(sidebarItems, checker(["super-admin"])),
    );
    expect(admin).toEqual(expect.arrayContaining(["Roles y permisos", "Auditoría", "Sistema"]));

    const none = collectTitles(filterSidebarItems(sidebarItems, checker([], ["users:read"])));
    expect(none).not.toEqual(expect.arrayContaining(["Roles y permisos"]));
    expect(none).not.toContain("Auditoría");
    expect(none).not.toContain("Sistema");
  });

  it("hides everything from a user with no permissions or capabilities", () => {
    expect(filterSidebarItems(sidebarItems, checker([]))).toEqual([]);
  });
});
