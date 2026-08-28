import { describe, expect, it } from "vitest";

import { filterSidebarItems } from "./filter-sidebar";
import { sidebarItems } from "./sidebar-items";

const checker = {
  isSuperAdmin: false,
  canAny: (permissions: string[]) =>
    permissions.some((permission) => permission === "users:read"),
  canAll: (permissions: string[]) =>
    permissions.every((permission) => permission === "users:read"),
  hasAnyRole: () => true,
};

describe("filterSidebarItems", () => {
  it("keeps only items the user can access", () => {
    const filtered = filterSidebarItems(sidebarItems, checker);

    const titles = filtered.flatMap((group) =>
      group.items.flatMap((item) => {
        if ("subItems" in item && item.subItems) {
          return item.subItems.map((sub) => sub.title);
        }
        return [item.title];
      }),
    );

    expect(titles).toContain("Usuarios");
    expect(titles).not.toContain("Actividades");
  });

  it("returns all items for super-admin", () => {
    const filtered = filterSidebarItems(sidebarItems, {
      isSuperAdmin: true,
      canAny: () => false,
      canAll: () => false,
      hasAnyRole: () => false,
    });

    expect(filtered.length).toBe(sidebarItems.length);
  });

  it("hides catalog editors when the user has catalogs:read but not an admin role", () => {
    const filtered = filterSidebarItems(sidebarItems, {
      isSuperAdmin: false,
      canAny: (permissions) =>
        permissions.includes("catalogs:read") ||
        permissions.includes("countries:read") ||
        permissions.includes("classes:read"),
      canAll: () => false,
      hasAnyRole: () => false,
    });

    const titles = collectTitles(filtered);
    expect(titles).not.toContain("Categorías finanzas");
    expect(titles).not.toContain("Países");
    expect(titles).not.toContain("Clases");
    expect(titles).toContain("Certificaciones GM");
  });

  it("keeps catalog editors for admin with catalogs:read", () => {
    const filtered = filterSidebarItems(sidebarItems, {
      isSuperAdmin: false,
      canAny: (permissions) => permissions.includes("catalogs:read"),
      canAll: () => false,
      hasAnyRole: (roles) => roles.includes("admin"),
    });

    const titles = collectTitles(filtered);
    expect(titles).toContain("Categorías finanzas");
  });
});

function collectTitles(
  groups: ReturnType<typeof filterSidebarItems>,
): string[] {
  const titles: string[] = [];

  const walk = (
    items: (typeof groups)[number]["items"] | undefined,
  ) => {
    if (!items) return;
    for (const item of items) {
      titles.push(item.title);
      if ("subItems" in item && item.subItems) {
        walk(item.subItems as typeof items);
      }
    }
  };

  for (const group of groups) {
    walk(group.items);
  }

  return titles;
}
