import { describe, expect, it } from "vitest";

import {
  CATALOG_RAIL_GROUPS,
  buildCatalogRailGroups,
  firstVisibleCatalogHref,
  isCatalogDetailPath,
} from "./rail-groups";

const build = (allowed: (id: string) => boolean, counts?: Record<string, number>) =>
  buildCatalogRailGroups({
    canOpen: (e) => allowed(e.id),
    catalogLabel: (e) => e.id,
    groupLabel: (id) => `g:${id}`,
    ...(counts ? { counts } : {}),
  });

describe("buildCatalogRailGroups", () => {
  it("keeps the five groups in order when everything is visible", () => {
    const groups = build(() => true);
    expect(groups.map((g) => g.label)).toEqual([
      "g:territory",
      "g:clubs",
      "g:honors",
      "g:health",
      "g:operation",
    ]);
    expect(groups.flatMap((g) => g.items)).toHaveLength(
      CATALOG_RAIL_GROUPS.flatMap((g) => g.entries).length,
    );
  });

  it("covers the 24 catalogs without duplicates", () => {
    const urls = CATALOG_RAIL_GROUPS.flatMap((g) => g.entries.map((e) => e.url));
    expect(urls).toHaveLength(24);
    expect(new Set(urls).size).toBe(24);
  });

  it("drops catalogs the user cannot open and the groups left empty", () => {
    const groups = build((id) => id === "catalogs-honors" || id === "catalogs-allergies");
    expect(groups.map((g) => g.label)).toEqual(["g:honors", "g:health"]);
    expect(groups[0]?.items).toEqual([{ href: "/dashboard/catalogs/honors", label: "catalogs-honors" }]);
  });

  it("adds a count only when one is known (zero included)", () => {
    const groups = build((id) => id.startsWith("catalogs-div") || id === "catalogs-countries", {
      "catalogs-divisions": 0,
    });
    const items = groups.flatMap((g) => g.items);
    expect(items.find((i) => i.label === "catalogs-divisions")).toHaveProperty("count", 0);
    expect(items.find((i) => i.label === "catalogs-countries")).not.toHaveProperty("count");
  });
});

describe("firstVisibleCatalogHref", () => {
  it("opens the first visible catalog", () => {
    expect(firstVisibleCatalogHref(build((id) => id === "catalogs-medicines"))).toBe(
      "/dashboard/catalogs/medicines",
    );
  });

  it("returns null when nothing is visible", () => {
    expect(firstVisibleCatalogHref(build(() => false))).toBeNull();
  });
});

describe("isCatalogDetailPath", () => {
  it.each([
    ["/dashboard/catalogs", false],
    ["/dashboard/catalogs/", false],
    ["/dashboard/catalogs/districts", false],
    ["/dashboard/catalogs/districts?page=2", false],
    ["/dashboard/catalogs/classes/12", true],
    ["/dashboard/catalogs/master-honors/3/", true],
    ["/dashboard/catalogs/certifications/7", true],
    ["/dashboard/clubs", false],
    [null, false],
  ])("%s -> %s", (path, expected) => {
    expect(isCatalogDetailPath(path as string | null)).toBe(expected);
  });
});
