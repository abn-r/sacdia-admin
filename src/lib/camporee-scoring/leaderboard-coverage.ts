import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeLeaderboardRow,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

export interface SectionCoverage {
  /** Scoring-enabled events this section is a scoring target of. */
  scorableEvents: number;
  /** Events the section has an active official score on (from the backend). */
  scoredEvents: number;
}

/**
 * Builds a per-section coverage lookup (keyed by `club_section_id`) from the
 * leaderboard rows and the events the detail page already loads. Returns
 * `null` when there are no scoring events, so callers can skip the column.
 */
export function buildSectionCoverage(
  events: BackendCamporeeEvent[],
  targetsByEvent: Record<number, CamporeeScoringTarget[]>,
  rows: CamporeeLeaderboardRow[],
): Map<number, SectionCoverage> | null {
  const scoringEvents = events.filter((event) => event.scoring_enabled);
  if (scoringEvents.length === 0) return null;

  const coverage = new Map<number, SectionCoverage>();
  for (const row of rows) {
    // Older backends don't send the count: leave the section without coverage.
    if (!Number.isFinite(row.scored_events_count)) continue;
    const scorableEvents = scoringEvents.filter((event) =>
      (targetsByEvent[event.camporee_event_id] ?? []).some(
        (target) => target.club_section_id === row.club_section_id,
      ),
    ).length;
    const scoredEvents = row.scored_events_count;
    coverage.set(row.club_section_id, {
      // A section can keep scores on an event it is no longer a target of.
      scorableEvents: Math.max(scorableEvents, scoredEvents),
      scoredEvents,
    });
  }
  return coverage;
}
