import { describe, expect, it } from "vitest";

import {
  defaultGroupOpen,
  groupsAreToggleable,
  parseGroupOpenState,
  readGroupOpenStateCookie,
  serializeGroupOpenStateCookie,
  sumGroupCounts,
} from "./group-state";
import type { NavGroup } from "./sidebar-items";

const item = (id: string) => ({ id, title: id, url: `/${id}` });

describe("group-state", () => {
  it("opens only Por atender and Clubes y miembros by default", () => {
    expect([0, 1, 2, 3, 4, 5].map(defaultGroupOpen)).toEqual([false, true, true, false, false, false]);
  });

  it("is toggleable only above 6 top-level items", () => {
    const make = (n: number): NavGroup[] => [{ id: 1, label: "x", items: Array.from({ length: n }, (_, i) => item(`i${i}`)) }];
    expect(groupsAreToggleable(make(6))).toBe(false);
    expect(groupsAreToggleable(make(7))).toBe(true);
  });

  it("round-trips the cookie and tolerates garbage", () => {
    const written = serializeGroupOpenStateCookie({ "1": false, "3": true });
    expect(written).toContain("path=/");
    expect(written).toContain("max-age=31536000");
    const value = written.split(";")[0]!;
    expect(readGroupOpenStateCookie(`foo=bar; ${value}`)).toEqual({ "1": false, "3": true });
    expect(parseGroupOpenState("[1,2]")).toEqual({});
    expect(parseGroupOpenState('{"1":"yes","2":true}')).toEqual({ "2": true });
    expect(readGroupOpenStateCookie("sidebar_groups=%E0%A4%A")).toEqual({});
  });

  it("sums leaf and nested counts of a group", () => {
    const group: NavGroup = {
      id: 1,
      label: "x",
      items: [
        item("a"),
        { id: "p", title: "p", subItems: [{ id: "c1", title: "c1", url: "/c1" }, { id: "c2", title: "c2", url: "/c2" }] },
      ],
    };
    expect(sumGroupCounts(group, { a: 1, c1: 2, c2: 3, other: 9 })).toBe(6);
  });
});
