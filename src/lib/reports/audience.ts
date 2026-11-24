export type ReportsAudience = "territory" | "club" | "none";

const ANCHORED_LEVELS = new Set(["all", "division", "union", "local_field"]);

/**
 * Who is looking at /reports, and so which monthly view they get:
 * - territory: a role anchored to a territory sees the reports of its scope;
 * - club: a club role sees its own club's reports (and can create/send them);
 * - none: neither a territory nor a club.
 * A role without a published territory (`open`) and without a club falls back
 * to the scoped list when it may read it (coordinators).
 */
export function resolveReportsAudience(input: {
  territoryLevel: string;
  hasClubContext: boolean;
  canSupervise: boolean;
}): ReportsAudience {
  if (ANCHORED_LEVELS.has(input.territoryLevel)) return "territory";
  if (input.hasClubContext) return "club";
  if (input.canSupervise) return "territory";
  return "none";
}
