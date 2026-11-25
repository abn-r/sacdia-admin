export type RubricBalanceState = "match" | "under" | "over";

export interface RubricBalance {
  total: number;
  max: number;
  /** max - total; positive means points are still missing. */
  diff: number;
  state: RubricBalanceState;
}

const EPSILON = 0.001;

/** Live comparison of the rubric sum against the event maximum. */
export function rubricBalance(
  rubrics: ReadonlyArray<{ max_points: number | string | null | undefined }>,
  maxPoints: number,
): RubricBalance {
  const total = rubrics.reduce((sum, rubric) => sum + (Number(rubric.max_points) || 0), 0);
  const diff = Math.round((maxPoints - total) * 100) / 100;
  const state: RubricBalanceState =
    Math.abs(diff) < EPSILON ? "match" : diff > 0 ? "under" : "over";
  return { total, max: maxPoints, diff, state };
}
