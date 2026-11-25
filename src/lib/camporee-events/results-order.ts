export interface ResultRowLike {
  club_section_id: number;
  rank?: number | null;
  percentage: number;
  total_awarded_points: number;
}

/**
 * Presentation order of the results. Follows the backend order (`rank`) and falls
 * back to percentage; the position itself is never shown to the user.
 */
export function orderResults<T extends ResultRowLike>(rows: ReadonlyArray<T>): T[] {
  return [...rows].sort(
    (a, b) =>
      (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY) ||
      b.percentage - a.percentage ||
      b.total_awarded_points - a.total_awarded_points ||
      a.club_section_id - b.club_section_id,
  );
}
