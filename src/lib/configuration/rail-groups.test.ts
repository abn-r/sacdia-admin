import { describe, expect, it } from "vitest";

import {
  CONFIGURATION_RAIL_GROUPS,
  buildConfigurationRailGroups,
  firstVisibleConfigurationHref,
} from "./rail-groups";

const build = (allowed: (url: string) => boolean) =>
  buildConfigurationRailGroups({
    canOpen: (e) => allowed(e.url),
    itemLabel: (id) => `i:${id}`,
    groupLabel: (id) => `g:${id}`,
  });

describe("buildConfigurationRailGroups", () => {
  it("keeps the four groups and nine items in order when everything is visible", () => {
    const groups = build(() => true);
    expect(groups.map((g) => g.label)).toEqual([
      "g:local_field",
      "g:investiture",
      "g:evaluation",
      "g:system",
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 3, 3, 1]);
  });

  it("never lists roles, audit, system or notifications", () => {
    const urls = CONFIGURATION_RAIL_GROUPS.flatMap((g) => g.entries.map((e) => e.url));
    for (const url of urls) {
      expect(url).not.toMatch(/\/(roles|permissions|matrix|audit|notifications|system)(\/|$)/);
    }
  });

  it("points the pastors item to the section of the investiture screen", () => {
    const items = build(() => true).flatMap((g) => g.items);
    expect(items.find((i) => i.label === "i:districtPastors")?.href).toBe(
      "/dashboard/configuration/investiture#pastors",
    );
  });

  it("gates by the screen url, not by the anchor", () => {
    const seen: string[] = [];
    buildConfigurationRailGroups({
      canOpen: (e) => {
        seen.push(e.url);
        return true;
      },
      itemLabel: (id) => id,
      groupLabel: (id) => id,
    });
    expect(seen.some((u) => u.includes("#"))).toBe(false);
  });

  it("drops hidden items and the groups left empty", () => {
    const groups = build((url) => url === "/dashboard/role-requirements");
    expect(groups).toEqual([
      { label: "g:evaluation", items: [{ href: "/dashboard/role-requirements", label: "i:roleRequirements" }] },
    ]);
  });
});

describe("firstVisibleConfigurationHref", () => {
  it("opens the first visible item", () => {
    expect(firstVisibleConfigurationHref(build((u) => u.endsWith("/variables")))).toBe(
      "/dashboard/configuration/variables",
    );
  });

  it("is null without visible items", () => {
    expect(firstVisibleConfigurationHref(build(() => false))).toBeNull();
  });
});
