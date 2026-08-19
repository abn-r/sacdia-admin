import { describe, expect, it } from "vitest";
import {
  countCompetitiveEnrolledClubs,
  hasCamporeeScoringArtifacts,
  isClubRegistrationClosed,
} from "@/lib/camporees/club-registration";
import type { CamporeeClub } from "@/lib/api/camporees";

function club(status: string): CamporeeClub {
  return {
    camporee_club_id: 1,
    camporee_id: 73,
    club_section_id: 2,
    status,
  };
}

describe("isClubRegistrationClosed", () => {
  it("trata vacío o null como abierta", () => {
    expect(isClubRegistrationClosed(null)).toBe(false);
    expect(isClubRegistrationClosed(undefined)).toBe(false);
    expect(isClubRegistrationClosed("")).toBe(false);
    expect(isClubRegistrationClosed("   ")).toBe(false);
  });

  it("trata un timestamp como cerrada", () => {
    expect(isClubRegistrationClosed("2026-08-19T20:58:24.000Z")).toBe(true);
  });
});

describe("countCompetitiveEnrolledClubs", () => {
  it("cuenta registered y approved", () => {
    expect(
      countCompetitiveEnrolledClubs([
        club("registered"),
        club("approved"),
        club("pending_approval"),
        club("rejected"),
      ]),
    ).toBe(2);
  });
});

describe("hasCamporeeScoringArtifacts", () => {
  it("bloquea reopen si hay jueces o ranking", () => {
    expect(hasCamporeeScoringArtifacts({ assignmentCount: 1 })).toBe(true);
    expect(hasCamporeeScoringArtifacts({ leaderboardRowCount: 2 })).toBe(true);
    expect(hasCamporeeScoringArtifacts({})).toBe(false);
  });
});
