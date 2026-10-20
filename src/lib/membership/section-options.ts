import { ApiError, apiRequest } from "@/lib/api/client";
import {
  getMyCoordinatorScope,
  type CoordinatorScopeSection,
} from "@/lib/api/coordination";
import type { MembershipReviewMode } from "@/lib/auth/membership-review-mode";

export type ReviewSectionOption = { club_section_id: number; label: string };

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
async function fetchClubSectionOptions(): Promise<ReviewSectionOption[]> {
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
        });
      }
    }
  }
  return sections;
}

/** Sections a coordinator covers, labelled like the club picker (`club · type`). */
export function coordinatorScopeToSectionOptions(
  sections: CoordinatorScopeSection[],
): ReviewSectionOption[] {
  return sections.map((section) => ({
    club_section_id: section.club_section_id,
    label: `${section.club_name ?? "Club"} · ${section.club_type_name ?? section.name ?? "Sección"}`,
  }));
}

/**
 * Sections the review page offers.
 *
 * - `approve`: the club sections of `GET /clubs` (unchanged behaviour).
 * - `verify-only`: the coordination scope (`GET /coordination/me/scope`) merged
 *   with `GET /clubs` (a reviewer with consent:verify through a club role has
 *   no coordination scope). Either source may fail on its own: coordinators
 *   usually cannot read /clubs. The page is unavailable only if both fail.
 */
export async function loadReviewSectionOptions(
  mode: MembershipReviewMode,
): Promise<ReviewSectionOptions> {
  if (mode === "approve") {
    try {
      return { sections: await fetchClubSectionOptions(), available: true };
    } catch (error) {
      return { sections: [], available: false, error: errorMessage(error) };
    }
  }

  const [scope, clubs] = await Promise.allSettled([
    getMyCoordinatorScope(),
    fetchClubSectionOptions(),
  ]);

  if (scope.status === "rejected" && clubs.status === "rejected") {
    return { sections: [], available: false, error: errorMessage(scope.reason) };
  }

  const merged = new Map<number, ReviewSectionOption>();
  const add = (options: ReviewSectionOption[]) => {
    for (const option of options) {
      if (!merged.has(option.club_section_id)) merged.set(option.club_section_id, option);
    }
  };
  if (scope.status === "fulfilled") {
    add(coordinatorScopeToSectionOptions(scope.value.sections ?? []));
  }
  if (clubs.status === "fulfilled") add(clubs.value);

  return { sections: [...merged.values()], available: true };
}
