import { describe, expect, it } from "vitest";
import {
  buildSectionCoverage,
  deriveScoredEventCount,
} from "@/lib/camporee-scoring/leaderboard-coverage";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type {
  CamporeeEventRubric,
  CamporeeScoringTarget,
} from "@/lib/api/camporee-scoring";

describe("deriveScoredEventCount", () => {
  it("counts events when the sum maps to a single subset size", () => {
    expect(deriveScoredEventCount(200, [100, 100, 100])).toBe(2);
    expect(deriveScoredEventCount(300, [100, 100, 100])).toBe(3);
    expect(deriveScoredEventCount(0, [100, 100])).toBe(0);
  });

  it("returns null when different subset sizes reach the same sum", () => {
    expect(deriveScoredEventCount(100, [100, 40, 60])).toBeNull();
  });

  it("returns null when the sum can't be reached", () => {
    expect(deriveScoredEventCount(150, [100, 100])).toBeNull();
  });
});

function event(id: number, scoring = true): BackendCamporeeEvent {
  return { camporee_event_id: id, scoring_enabled: scoring } as BackendCamporeeEvent;
}
function rubric(eventId: number, max: number, active = true): CamporeeEventRubric {
  return {
    camporee_event_rubric_id: eventId * 10 + max,
    camporee_event_id: eventId,
    title: "r",
    description: null,
    max_points: max,
    display_order: 0,
    active,
  };
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

describe("buildSectionCoverage", () => {
  const events = [event(1), event(2), event(3), event(4, false)];
  const rubrics = {
    1: [rubric(1, 40), rubric(1, 60)],
    2: [rubric(2, 100), rubric(2, 25, false)],
    3: [rubric(3, 100)],
  };
  const targets = {
    1: [target(7), target(8)],
    2: [target(7), target(8)],
    3: [target(7)],
    4: [target(7)],
  };

  it("derives scorable events, possible points and scored events per section", () => {
    const coverage = buildSectionCoverage(
      events,
      rubrics,
      targets,
      new Map([
        [7, 200],
        [8, 200],
      ]),
    );

    expect(coverage?.get(7)).toEqual({
      scorableEvents: 3,
      possibleMaxPoints: 300,
      scoredEvents: 2,
    });
    // Section 8 is not a target of event 3.
    expect(coverage?.get(8)).toEqual({
      scorableEvents: 2,
      possibleMaxPoints: 200,
      scoredEvents: 2,
    });
  });

  it("returns null without scoring events", () => {
    expect(buildSectionCoverage([event(4, false)], {}, {}, new Map())).toBeNull();
  });
});
