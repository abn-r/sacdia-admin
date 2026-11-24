import { describe, expect, it } from "vitest";
import {
  breakdownComponents,
  clampPercent,
  commonMaxPoints,
  paginate,
  pendingKind,
  recognitionStatus,
  sortByProgress,
} from "./annual";

const tier = (name: string, points: number | null) => ({
  name,
  slug: name.toLowerCase(),
  from_points: 0,
  to_points: 0,
  points_to_reach: points,
});

describe("recognitionStatus", () => {
  it("says what was reached and what is next", () => {
    expect(recognitionStatus({ current_tier: tier("Plata", null), next_tier: tier("Oro", 978) })).toEqual({
      kind: "reached",
      name: "Plata",
      next: { name: "Oro", pointsToReach: 978 },
    });
  });

  it("reached without a next one", () => {
    expect(recognitionStatus({ current_tier: tier("Oro", null), next_tier: null })).toEqual({
      kind: "reached",
      name: "Oro",
      next: null,
    });
  });

  it("says how much is missing when nothing was reached", () => {
    expect(recognitionStatus({ current_tier: null, next_tier: tier("Bronce", 550) })).toEqual({
      kind: "missing",
      next: { name: "Bronce", pointsToReach: 550 },
    });
  });

  it("ignores a next tier without a usable distance", () => {
    expect(recognitionStatus({ current_tier: null, next_tier: tier("Bronce", null) })).toEqual({ kind: "none" });
    expect(recognitionStatus({ current_tier: null, next_tier: tier("Bronce", 0) })).toEqual({ kind: "none" });
  });
});

describe("sortByProgress", () => {
  const row = (club_name: string, progress_percentage: number, current_points: number) => ({
    club_name,
    progress_percentage,
    current_points,
  });

  it("puts the furthest along first without mutating", () => {
    const input = [row("B", 40, 1200), row("A", 88, 2640), row("C", 40, 1300)];
    expect(sortByProgress(input).map((r) => r.club_name)).toEqual(["A", "C", "B"]);
    expect(input[0]?.club_name).toBe("B");
  });

  it("breaks full ties by name", () => {
    expect(sortByProgress([row("Z", 10, 5), row("M", 10, 5)]).map((r) => r.club_name)).toEqual(["M", "Z"]);
  });
});

describe("commonMaxPoints", () => {
  it("returns the shared maximum or null", () => {
    expect(commonMaxPoints([])).toBeNull();
    expect(commonMaxPoints([{ max_points: 3000 }, { max_points: 3000 }])).toBe(3000);
    expect(commonMaxPoints([{ max_points: 3000 }, { max_points: 2000 }])).toBeNull();
  });
});

describe("paginate and clampPercent", () => {
  it("slices by page", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(paginate([1, 2, 3], 0, 2)).toEqual([1, 2]);
  });

  it("clamps the bar", () => {
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(-3)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});

describe("breakdownComponents", () => {
  const component = (key: string) => ({ key, label: key, earned_points: 1, max_points: 2, progress_percentage: 50 });

  it("uses flat components when there are any", () => {
    expect(breakdownComponents({ axes: [], components: [component("a")] }).map((c) => c.key)).toEqual(["a"]);
  });

  it("flattens the components of every axis", () => {
    const axes = [
      { ...component("x1"), components: [component("a"), component("b")] },
      { ...component("x2"), components: [component("c")] },
    ];
    expect(breakdownComponents({ axes, components: [] }).map((c) => c.key)).toEqual(["a", "b", "c"]);
  });

  it("falls back to the axes themselves", () => {
    const axes = [{ ...component("x1"), components: [] }];
    expect(breakdownComponents({ axes, components: [] }).map((c) => c.key)).toEqual(["x1"]);
  });
});

describe("pendingKind", () => {
  it("maps folder statuses", () => {
    expect(pendingKind("pending_delivery")).toBe("unsent");
    expect(pendingKind("pending_validation")).toBe("validation");
    expect(pendingKind("pending_union_validation")).toBe("union");
    expect(pendingKind("anything_else")).toBe("review");
  });
});
