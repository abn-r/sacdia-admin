import { ApiError, apiRequest } from "@/lib/api/client";
import {
  getMyCoordinatorScope,
  type CoordinatorScopeSection,
} from "@/lib/api/coordination";
import type { MembershipReviewMode } from "@/lib/auth/membership-review-mode";

/**
 * `mode` is the review mode that applies to THAT section: `approve` only where
 * the viewer's club_members:approve comes from their own club context;
 * `verify-only` where the section is reached through a coordinator assignment
 * (the backend forces verify-only there, whatever the viewer holds elsewhere).
 */
export type ReviewSectionOption = {
  club_section_id: number;
  label: string;
  mode: MembershipReviewMode;
};

export type ReviewSectionOptions = {
  sections: ReviewSectionOption[];
  available: boolean;
  error?: string;
};

type ClubSection = {
  club_section_id: number;
  club_types?: { name?: string } | null;
  club_type?: { name?: string } | null;
  active: boolean;
};

type Club = {
  name?: string;
  sections?: ClubSection[];
  club_sections?: ClubSection[];
};

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "unexpected";
}

/** Active sections of the clubs the viewer can read (`GET /clubs`). */
async function fetchClubSectionOptions(
  mode: MembershipReviewMode,
): Promise<ReviewSectionOption[]> {
  const payload = await apiRequest<unknown>("/clubs");

  let clubs: Club[] = [];
  if (Array.isArray(payload)) {
    clubs = payload as Club[];
  } else if (payload && typeof payload === "object") {
    const res = payload as { data?: unknown };
    if (Array.isArray(res.data)) clubs = res.data as Club[];
  }

  const sections: ReviewSectionOption[] = [];
  for (const club of clubs) {
    const clubName = club.name ?? "Club";
    for (const section of club.club_sections ?? club.sections ?? []) {
      if (section.active && section.club_section_id) {
        const typeName = section.club_types?.name ?? section.club_type?.name ?? "Sección";
        sections.push({
          club_section_id: section.club_section_id,
          label: `${clubName} · ${typeName}`,
          mode,
        });
      }
    }
  }
  return sections;
}

/** Sections a coordinator covers, labelled like the club picker (`club · type`). Always verify-only. */
export function coordinatorScopeToSectionOptions(
  sections: CoordinatorScopeSection[],
): ReviewSectionOption[] {
  return sections.map((section) => ({
    club_section_id: section.club_section_id,
    label: `${section.club_name ?? "Club"} · ${section.club_type_name ?? section.name ?? "Sección"}`,
    mode: "verify-only",
  }));
}

/**
 * Sections the review page offers, each tagged with its own review mode.
 *
 * - Club sections (`GET /clubs`) carry the viewer's page mode: `approve` for a
 *   club_members:approve holder, `verify-only` otherwise.
 * - Coordination scope sections (`GET /coordination/me/scope`) are always
 *   `verify-only`. They are merged whenever the viewer has consent:verify:
 *   always in `verify-only` mode, and in `approve` mode when
 *   `includeCoordinatorScope` is set (a coordinator who is also director or
 *   secretary in some club).
 * - Deduped by id; a section in both sources keeps the club entry (listed
 *   first). Either source may fail on its own: coordinators usually cannot
 *   read /clubs. The page is unavailable only if every source fails.
 */
export async function loadReviewSectionOptions(
  mode: MembershipReviewMode,
  options: { includeCoordinatorScope?: boolean } = {},
): Promise<ReviewSectionOptions> {
  const withScope = mode === "verify-only" || options.includeCoordinatorScope === true;

  if (!withScope) {
    try {
      return { sections: await fetchClubSectionOptions(mode), available: true };
    } catch (error) {
      return { sections: [], available: false, error: errorMessage(error) };
    }
  }

  const [clubs, scope] = await Promise.allSettled([
    fetchClubSectionOptions(mode),
    getMyCoordinatorScope(),
  ]);

  if (scope.status === "rejected" && clubs.status === "rejected") {
    return { sections: [], available: false, error: errorMessage(scope.reason) };
  }

  const merged = new Map<number, ReviewSectionOption>();
  const add = (list: ReviewSectionOption[]) => {
    for (const option of list) {
      if (!merged.has(option.club_section_id)) merged.set(option.club_section_id, option);
    }
  };
  if (clubs.status === "fulfilled") add(clubs.value);
  if (scope.status === "fulfilled") {
    add(coordinatorScopeToSectionOptions(scope.value.sections ?? []));
  }

  return { sections: [...merged.values()], available: true };
}
