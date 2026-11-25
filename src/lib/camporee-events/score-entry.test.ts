import { describe, expect, it } from "vitest";
import { scoreEntryTotals } from "./score-entry";

const rubrics = [
  { camporee_event_rubric_id: 1, max_points: 80 },
  { camporee_event_rubric_id: 2, max_points: 60 },
  { camporee_event_rubric_id: 3, max_points: 60 },
];

describe("scoreEntryTotals", () => {
  it("adds the awarded points against the maximum", () => {
    expect(scoreEntryTotals(rubrics, { 1: 72, 2: 50, 3: 58 })).toEqual({ awarded: 180, max: 200, overMax: [] });
  });

  it("treats a missing value as zero", () => {
    expect(scoreEntryTotals(rubrics, { 1: 10 }).awarded).toBe(10);
  });

  it("lists the criteria that exceed their maximum", () => {
    expect(scoreEntryTotals(rubrics, { 1: 81, 2: 60, 3: 61 }).overMax).toEqual([1, 3]);
  });
});
