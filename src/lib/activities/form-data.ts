import { getActivity } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import { listClubTypes } from "@/lib/api/catalogs";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";
import { loadClubContextClubs } from "@/lib/club-context/load-clubs";
import { resolveClubContext } from "@/lib/club-context/scope";
import type { ClubContextClub } from "@/lib/club-context/types";
import { normalizeActivity } from "@/lib/activities/helpers";

export type ActivityFormData = {
  club: ClubContextClub;
  /** Section preselected in the form (the one chosen in the context bar). */
  defaultSectionId: number;
  activity: Activity | null;
};

type SearchValue = string | string[] | undefined;

function unwrapActivity(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const nested = root.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    if (inner.activity_id != null || inner.name != null) return inner;
    if (inner.data && typeof inner.data === "object") return inner.data as Record<string, unknown>;
  }
  return root.activity_id != null || root.name != null ? root : null;
}

/**
 * Data of the new / edit activity modal, shared by the intercepted and the
 * direct route. Returns `null` when the actor cannot do it, or when the club
 * (or the activity) cannot be resolved: the caller sends them back to the list.
 */
export async function loadActivityFormData(
  user: AuthUser,
  args: {
    searchParams: { club?: SearchValue; section?: SearchValue };
    cookie?: string | null;
    activityId?: number;
  },
): Promise<ActivityFormData | null> {
  const isEdit = args.activityId !== undefined;
  if (!canCapability(user, "activities", isEdit ? "update" : "create")) return null;

  const clubTypes = await listClubTypes().catch(() => []);
  const loaded = await loadClubContextClubs(clubTypes);
  if (!loaded.ok) return null;

  let activity: Activity | null = null;
  if (args.activityId !== undefined) {
    const raw = await getActivity(args.activityId).then(unwrapActivity, () => null);
    if (!raw) return null;
    activity = normalizeActivity(raw);
    if (activity.activity_id <= 0) return null;
    const club = loaded.clubs.find((candidate) => candidate.club_id === activity?.club_id);
    if (!club) return null;
    return { club, defaultSectionId: activity.club_section_id, activity };
  }

  const { club, section } = resolveClubContext({
    clubs: loaded.clubs,
    searchParams: args.searchParams,
    cookie: args.cookie,
  });
  if (!club) return null;
  const sectionId = section?.club_section_id ?? club.sections[0]?.club_section_id;
  if (!sectionId) return null;
  return { club, defaultSectionId: sectionId, activity: null };
}
