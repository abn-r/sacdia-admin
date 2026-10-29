import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeEventRubric,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

const MAX_EVENTS_FOR_SUBSET_SUM = 30;

export interface SectionCoverage {
  /** Scoring-enabled events this section is a scoring target of. */
  scorableEvents: number;
  /** Sum of the active rubric max points of those events. */
  possibleMaxPoints: number;
  /**
   * How many events the section has been scored on, or `null` when the
   * leaderboard's `total_max_points` can't be mapped to a single event count.
   */
  scoredEvents: number | null;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

/**
 * The leaderboard row only exposes the summed `total_max_points` of the events
 * a section has been scored on. Find which subsets of the section's scorable
 * events add up to that sum; the count is only returned when every matching
 * subset has the same size, otherwise it is ambiguous and `null` is returned.
 */
export function deriveScoredEventCount(
  totalMaxPoints: number,
  eventMaxPoints: number[],
): number | null {
  const target = toCents(totalMaxPoints);
  if (target === 0) return 0;

  const maxes = eventMaxPoints.map(toCents).filter((value) => value > 0);
  if (maxes.length === 0 || maxes.length > MAX_EVENTS_FOR_SUBSET_SUM) return null;

  // sum (cents) -> set of subset sizes reaching it.
  let reachable = new Map<number, Set<number>>([[0, new Set([0])]]);
  for (const max of maxes) {
    const next = new Map<number, Set<number>>();
    const add = (sum: number, count: number) => {
      if (sum > target) return;
      const sizes = next.get(sum) ?? new Set<number>();
      sizes.add(count);
      next.set(sum, sizes);
    };
    for (const [sum, sizes] of reachable) {
      for (const size of sizes) {
        add(sum, size);
        add(sum + max, size + 1);
      }
    }
    reachable = next;
  }

  const sizes = reachable.get(target);
  if (!sizes || sizes.size !== 1) return null;
  return [...sizes][0] ?? null;
}

/**
 * Builds a per-section coverage lookup (keyed by `club_section_id`) from the
 * data the detail page already loads. Returns `null` when events were not
 * loaded, so callers can skip the coverage column.
 */
export function buildSectionCoverage(
  events: BackendCamporeeEvent[],
  rubricsByEvent: Record<number, CamporeeEventRubric[]>,
  targetsByEvent: Record<number, CamporeeScoringTarget[]>,
  scoredMaxBySection: Map<number, number>,
): Map<number, SectionCoverage> | null {
  const scoringEvents = events.filter((event) => event.scoring_enabled);
  if (scoringEvents.length === 0) return null;

  const eventMax = (eventId: number) =>
    (rubricsByEvent[eventId] ?? [])
      .filter((rubric) => rubric.active)
      .reduce((total, rubric) => total + Number(rubric.max_points || 0), 0);

  const coverage = new Map<number, SectionCoverage>();
  for (const [sectionId, scoredMax] of scoredMaxBySection) {
    const maxes = scoringEvents
      .filter((event) =>
        (targetsByEvent[event.camporee_event_id] ?? []).some(
          (target) => target.club_section_id === sectionId,
        ),
      )
      .map((event) => eventMax(event.camporee_event_id));

    coverage.set(sectionId, {
      scorableEvents: maxes.length,
      possibleMaxPoints: maxes.reduce((total, value) => total + value, 0),
      scoredEvents: deriveScoredEventCount(scoredMax, maxes),
    });
  }
  return coverage;
}
