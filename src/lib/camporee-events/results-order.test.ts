import { describe, expect, it } from "vitest";
import { orderResults } from "./results-order";

const row = (club_section_id: number, percentage: number, rank: number | null, total_awarded_points = 0) => ({
  club_section_id,
  percentage,
  rank,
  total_awarded_points,
});

describe("orderResults", () => {
  it("follows the backend rank first", () => {
    const rows = orderResults([row(3, 50, 2), row(1, 80, 1), row(2, 90, null)]);
    expect(rows.map((r) => r.club_section_id)).toEqual([1, 3, 2]);
  });

  it("falls back to percentage, then points, then id for unranked rows", () => {
    const rows = orderResults([row(4, 70, null, 10), row(2, 70, null, 30), row(3, 90, null), row(1, 70, null, 30)]);
    expect(rows.map((r) => r.club_section_id)).toEqual([3, 1, 2, 4]);
  });

  it("does not mutate the input", () => {
    const input = [row(2, 10, 2), row(1, 20, 1)];
    orderResults(input);
    expect(input.map((r) => r.club_section_id)).toEqual([2, 1]);
  });
});
