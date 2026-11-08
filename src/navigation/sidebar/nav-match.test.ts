import { describe, expect, it } from "vitest";

import { getBestMatchLength, isLeafActive, isSubItemActiveFor } from "./nav-match";
import type { NavGroup } from "./sidebar-items";

const groups: NavGroup[] = [
  {
    id: 1,
    items: [
      { id: "clubs", title: "Clubes", url: "/dashboard/clubs", activeMatch: "clubs-list" },
      {
        id: "parent",
        title: "Padre",
        subItems: [{ id: "val", title: "Validaciones", url: "/dashboard/clubs/validations", activeMatch: "prefix" }],
      },
    ],
  },
  {
    id: 2,
    items: [{ id: "activities", title: "Actividades", url: "/dashboard/clubs/activities", activeMatch: "prefix" }],
  },
];

describe("nav-match", () => {
  it("only the most specific item is active on /dashboard/clubs/activities", () => {
    const path = "/dashboard/clubs/activities";
    const best = getBestMatchLength(path, groups);
    expect(isLeafActive(path, { url: "/dashboard/clubs", activeMatch: "clubs-list" }, best)).toBe(false);
    expect(isLeafActive(path, { url: "/dashboard/clubs/activities", activeMatch: "prefix" }, best)).toBe(true);
  });

  it("Clubes stays active on a club detail path", () => {
    const path = "/dashboard/clubs/42";
    const best = getBestMatchLength(path, groups);
    expect(isLeafActive(path, { url: "/dashboard/clubs", activeMatch: "clubs-list" }, best)).toBe(true);
  });

  it("nested sub items resolve through the shared best length", () => {
    const path = "/dashboard/clubs/validations/7";
    const best = getBestMatchLength(path, groups);
    const subItem = groups[0].items[1].subItems?.[0];
    expect(subItem).toBeDefined();
    expect(isSubItemActiveFor(path, subItem!, best)).toBe(true);
  });
});
