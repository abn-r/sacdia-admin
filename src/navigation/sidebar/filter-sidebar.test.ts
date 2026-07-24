import { describe, expect, it } from "vitest";

import { filterSidebarItems } from "./filter-sidebar";
import { sidebarItems } from "./sidebar-items";

const checker = {
  isSuperAdmin: false,
  canAny: (permissions: string[]) =>
    permissions.some((permission) => permission === "users:read"),
  canAll: (permissions: string[]) =>
    permissions.every((permission) => permission === "users:read"),
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
    });

    expect(filtered.length).toBe(sidebarItems.length);
  });
});
