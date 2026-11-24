import type {
  AnnualRankingComponentProgress,
  AnnualRankingLeaderboardRow,
  AnnualRankingPendingItem,
  AnnualRankingSectionProgress,
  AnnualRankingTier,
} from "@/lib/api/annual-rankings";

/**
 * Pure helpers of «Progreso anual». Progress is shown without positions: clubs
 * are sorted by how far they got and each one says which recognition it has or
 * how much is missing for the next one.
 */

export type NextRecognition = { name: string; pointsToReach: number };

export type RecognitionStatus =
  | { kind: "reached"; name: string; next: NextRecognition | null }
  | { kind: "missing"; next: NextRecognition }
  | { kind: "none" };

function nextRecognition(tier: AnnualRankingTier | null): NextRecognition | null {
  if (!tier) return null;
  const points = tier.points_to_reach;
  if (typeof points !== "number" || !Number.isFinite(points) || points <= 0) return null;
  return { name: tier.name, pointsToReach: points };
}

/** The recognition a club reached, or what it needs for the next one. */
export function recognitionStatus(
  row: Pick<AnnualRankingLeaderboardRow, "current_tier" | "next_tier">,
): RecognitionStatus {
  const next = nextRecognition(row.next_tier);
  if (row.current_tier) {
    return { kind: "reached", name: row.current_tier.name, next };
  }
  return next ? { kind: "missing", next } : { kind: "none" };
}

/** Furthest along first; ties by points and then by name. Does not mutate. */
export function sortByProgress<T extends Pick<AnnualRankingLeaderboardRow, "progress_percentage" | "current_points" | "club_name">>(
  rows: readonly T[],
): T[] {
  return [...rows].sort(
    (a, b) =>
      b.progress_percentage - a.progress_percentage ||
      b.current_points - a.current_points ||
      a.club_name.localeCompare(b.club_name),
  );
}

/** The maximum when every club shares one (the usual case), otherwise null. */
export function commonMaxPoints(rows: readonly Pick<AnnualRankingLeaderboardRow, "max_points">[]): number | null {
  const first = rows[0]?.max_points;
  if (first === undefined) return null;
  return rows.every((row) => row.max_points === first) ? first : null;
}

export function paginate<T>(items: readonly T[], page: number, limit: number): T[] {
  const start = (Math.max(page, 1) - 1) * limit;
  return items.slice(start, start + limit);
}

/** Bar width: clamped to 0-100 so a bad value never overflows the track. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * One list of components for the breakdown. Configs with axes list their
 * components inside each axis; the axes themselves are not shown. A config
 * with neither falls back to the axes as rows so nothing disappears.
 */
export function breakdownComponents(
  data: Pick<AnnualRankingSectionProgress, "axes" | "components">,
): AnnualRankingComponentProgress[] {
  if (data.components.length > 0) return data.components;
  const fromAxes = data.axes.flatMap((axis) => axis.components);
  if (fromAxes.length > 0) return fromAxes;
  return data.axes.map(({ key, label, earned_points, max_points, progress_percentage }) => ({
    key,
    label,
    earned_points,
    max_points,
    progress_percentage,
  }));
}

export type PendingKind = "unsent" | "validation" | "union" | "review";

/** What the club still has to do or wait for, by the status of the folder item. */
export function pendingKind(status: AnnualRankingPendingItem["status"]): PendingKind {
  switch (status) {
    case "pending_delivery":
      return "unsent";
    case "pending_validation":
      return "validation";
    case "pending_union_validation":
      return "union";
    default:
      return "review";
  }
}
