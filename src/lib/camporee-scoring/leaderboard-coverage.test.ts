import { describe, expect, it } from "vitest";
import { buildSectionCoverage } from "@/lib/camporee-scoring/leaderboard-coverage";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeLeaderboardRow,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

function event(id: number, scoring = true): BackendCamporeeEvent {
  return { camporee_event_id: id, scoring_enabled: scoring } as BackendCamporeeEvent;
}
function target(sectionId: number): CamporeeScoringTarget {
  return {
    camporee_club_id: 1,
    club_section_id: sectionId,
    club_name: null,
    section_name: null,
    status: "approved",
  };
}
function row(sectionId: number, scored: number): CamporeeLeaderboardRow {
  return {
    rank: 1,
    camporee_club_id: 1,
    club_section_id: sectionId,
    club_name: null,
    section_name: null,
    total_awarded_points: 0,
    total_max_points: 0,
    scored_events_count: scored,
    percentage: 0,
  };
}

describe("buildSectionCoverage", () => {
  const events = [event(1), event(2), event(3), event(4, false)];
  const targets = {
    1: [target(7), target(8)],
    2: [target(7), target(8)],
    3: [target(7)],
    4: [target(7)],
  };

  it("pairs the backend scored count with the scorable events per section", () => {
    const coverage = buildSectionCoverage(events, targets, [row(7, 2), row(8, 1)]);

    expect(coverage?.get(7)).toEqual({ scorableEvents: 3, scoredEvents: 2 });
    // Section 8 is not a target of event 3; event 4 has scoring off.
    expect(coverage?.get(8)).toEqual({ scorableEvents: 2, scoredEvents: 1 });
  });

  it("never shows more scored than scorable events", () => {
    const coverage = buildSectionCoverage(events, targets, [row(8, 3)]);

    expect(coverage?.get(8)).toEqual({ scorableEvents: 3, scoredEvents: 3 });
  });

  it("skips rows without a scored count", () => {
    const legacy = { ...row(7, 0), scored_events_count: undefined } as unknown as CamporeeLeaderboardRow;
    const coverage = buildSectionCoverage(events, targets, [legacy]);

    expect(coverage?.has(7)).toBe(false);
  });

  it("returns null without scoring events", () => {
    expect(buildSectionCoverage([event(4, false)], {}, [])).toBeNull();
  });
});
