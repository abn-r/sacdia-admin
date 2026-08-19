import type { CamporeeClub } from "@/lib/api/camporees";

const COMPETITIVE_CLUB_STATUSES = new Set(["registered", "approved"]);

export function isClubRegistrationClosed(
  closedAt?: string | null,
): boolean {
  return typeof closedAt === "string" && closedAt.trim().length > 0;
}

export function countCompetitiveEnrolledClubs(
  clubs: CamporeeClub[],
): number {
  return clubs.filter((club) => {
    const status = club.status?.trim().toLowerCase();
    return status != null && COMPETITIVE_CLUB_STATUSES.has(status);
  }).length;
}

export function hasCamporeeScoringArtifacts(input: {
  assignmentCount?: number;
  leaderboardRowCount?: number;
}): boolean {
  return (input.assignmentCount ?? 0) > 0 || (input.leaderboardRowCount ?? 0) > 0;
}
