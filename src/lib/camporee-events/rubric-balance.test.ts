import { describe, expect, it } from "vitest";
import { rubricBalance } from "./rubric-balance";

describe("rubricBalance", () => {
  it("matches when the sum equals the maximum", () => {
    expect(rubricBalance([{ max_points: 80 }, { max_points: 120 }], 200)).toEqual({
      total: 200,
      max: 200,
      diff: 0,
      state: "match",
    });
  });

  it("reports the missing points while the sum is short", () => {
    const balance = rubricBalance([{ max_points: 80 }, { max_points: 60 }, { max_points: 40 }], 200);
    expect(balance).toMatchObject({ total: 180, diff: 20, state: "under" });
  });

  it("reports the excess when the sum goes over", () => {
    expect(rubricBalance([{ max_points: 150 }, { max_points: 80 }], 200)).toMatchObject({
      diff: -30,
      state: "over",
    });
  });

  it("tolerates decimals and non-numeric values", () => {
    expect(rubricBalance([{ max_points: 0.1 }, { max_points: 0.2 }, { max_points: 99.7 }], 100).state).toBe("match");
    expect(rubricBalance([{ max_points: "x" }, { max_points: null }], 10)).toMatchObject({ total: 0, state: "under" });
  });
});
