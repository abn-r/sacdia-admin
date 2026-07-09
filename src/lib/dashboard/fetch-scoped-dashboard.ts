import { apiRequest } from "@/lib/api/client";
import { listAdminUsers } from "@/lib/api/admin-users";
import {
  listMembershipRequests,
  type MembershipRequest,
} from "@/lib/api/membership-requests";
import { hasPermission } from "@/lib/auth/permission-utils";
import { CLUB_MEMBERS_APPROVE } from "@/lib/auth/permissions";
import {
  resolveAdminTerritoryScope,
  type AdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";
import { fetchClubsList, type ClubListItem } from "@/lib/clubs/fetch-list";

export type ScopedDashboardStats = {
  scope: AdminTerritoryScope;
  scopeLabelKey:
    | "scopeAll"
    | "scopeDivision"
    | "scopeUnion"
    | "scopeLocalField";
  scopeName: string | null;
  totalUsers: number | null;
  activeClubs: number | null;
  totalClubs: number | null;
  pendingMembershipCount: number | null;
  canReviewMembership: boolean;
};

export type PendingMembershipPreview = {
  assignmentId: string;
  clubSectionId: number;
  sectionLabel: string;
  clubId: number | null;
  clubName: string;
  userName: string;
  createdAt: string;
};

export type PendingMembershipSummary = {
  totalCount: number;
  previews: PendingMembershipPreview[];
  canReview: boolean;
};

type ClubSectionRef = {
  club_section_id: number;
  club_id: number | null;
  club_name: string;
  section_label: string;
  active: boolean;
};

const MAX_SECTIONS_FOR_PENDING_SCAN = 60;

function getScopeLabelKey(
  scope: AdminTerritoryScope,
): ScopedDashboardStats["scopeLabelKey"] {
  switch (scope.level) {
    case "division":
      return "scopeDivision";
    case "union":
      return "scopeUnion";
    case "local_field":
      return "scopeLocalField";
    default:
      return "scopeAll";
  }
}

function getScopeName(scope: AdminTerritoryScope): string | null {
  switch (scope.level) {
    case "division":
      return scope.divisionName ?? null;
    case "union":
      return scope.unionName ?? null;
    case "local_field":
      return scope.localFieldName ?? null;
    default:
      return null;
  }
}

function extractClubSections(clubs: ClubListItem[]): ClubSectionRef[] {
  const sections: ClubSectionRef[] = [];

  for (const club of clubs) {
    const clubId = club.club_id ?? club.id ?? null;
    const clubName = club.name ?? "Club";
    const clubSections = Array.isArray(club.club_sections) ? club.club_sections : [];

    for (const section of clubSections) {
      const sectionId = section.club_section_id;
      if (!sectionId || section.active === false) continue;

      const typeName =
        (section as { club_type?: { name?: string } }).club_type?.name ??
        (section as { name?: string }).name ??
        "Sección";

      sections.push({
        club_section_id: sectionId,
        club_id: typeof clubId === "number" ? clubId : null,
        club_name: clubName,
        section_label: typeName,
        active: section.active ?? true,
      });
    }
  }

  return sections;
}

function getRequestUserName(request: MembershipRequest): string {
  const user = request.users;
  if (!user) return "—";
  const parts = [user.name, user.paternal_last_name, user.maternal_last_name].filter(
    Boolean,
  );
  if (parts.length > 0) return parts.join(" ");
  return user.email ?? "—";
}

export async function fetchScopedDashboardStats(
  user: AuthUser,
): Promise<ScopedDashboardStats> {
  const scope = resolveAdminTerritoryScope(user);
  const canReviewMembership = hasPermission(user, CLUB_MEMBERS_APPROVE);

  const clubsQuery = {
    page: 1,
    limit: 100,
    active: true as const,
    ...(scope.level === "local_field"
      ? { localFieldId: scope.localFieldId }
      : {}),
  };

  const [usersResult, clubsResult, pendingSummary] = await Promise.all([
    listAdminUsers({ page: 1, limit: 1 }).catch(() => null),
    fetchClubsList(clubsQuery),
    canReviewMembership
      ? fetchPendingMembershipSummary(user).catch(() => ({
          totalCount: 0,
          previews: [],
          canReview: true,
        }))
      : Promise.resolve({
          totalCount: 0,
          previews: [],
          canReview: false,
        }),
  ]);

  return {
    scope,
    scopeLabelKey: getScopeLabelKey(scope),
    scopeName: getScopeName(scope),
    totalUsers: usersResult?.meta?.total ?? null,
    activeClubs: clubsResult.available ? clubsResult.meta.total : null,
    totalClubs: clubsResult.available ? clubsResult.meta.total : null,
    pendingMembershipCount: canReviewMembership ? pendingSummary.totalCount : null,
    canReviewMembership,
  };
}

export async function fetchPendingMembershipSummary(
  user: AuthUser,
): Promise<PendingMembershipSummary> {
  const canReview = hasPermission(user, CLUB_MEMBERS_APPROVE);
  if (!canReview) {
    return { totalCount: 0, previews: [], canReview: false };
  }

  const scope = resolveAdminTerritoryScope(user);
  const clubsResult = await fetchClubsList({
    page: 1,
    limit: 100,
    active: true,
    ...(scope.level === "local_field"
      ? { localFieldId: scope.localFieldId }
      : {}),
  });

  if (!clubsResult.available) {
    return { totalCount: 0, previews: [], canReview: true };
  }

  const sectionRefs = extractClubSections(clubsResult.items).slice(
    0,
    MAX_SECTIONS_FOR_PENDING_SCAN,
  );

  const settled = await Promise.allSettled(
    sectionRefs.map(async (section) => {
      const requests = await listMembershipRequests(section.club_section_id);
      return requests.map((request) => ({ request, section }));
    }),
  );

  const previews: PendingMembershipPreview[] = [];

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const { request, section } of result.value) {
      previews.push({
        assignmentId: request.assignment_id,
        clubSectionId: section.club_section_id,
        sectionLabel: section.section_label,
        clubId: section.club_id,
        clubName: section.club_name,
        userName: getRequestUserName(request),
        createdAt: request.created_at,
      });
    }
  }

  previews.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    totalCount: previews.length,
    previews: previews.slice(0, 5),
    canReview: true,
  };
}

export async function fetchPendingCountForClubSections(
  sectionIds: number[],
): Promise<number> {
  if (sectionIds.length === 0) return 0;

  const settled = await Promise.allSettled(
    sectionIds.map((sectionId) => listMembershipRequests(sectionId)),
  );

  return settled.reduce((total, result) => {
    if (result.status !== "fulfilled") return total;
    return total + result.value.length;
  }, 0);
}

export async function fetchPendingCountsByClubId(
  user: AuthUser,
  clubs: ClubListItem[],
): Promise<Record<number, number>> {
  if (!hasPermission(user, CLUB_MEMBERS_APPROVE)) {
    return {};
  }

  const sectionRefs = extractClubSections(clubs);
  if (sectionRefs.length === 0) return {};

  const counts: Record<number, number> = {};

  const settled = await Promise.allSettled(
    sectionRefs.map(async (section) => {
      const requests = await listMembershipRequests(section.club_section_id);
      return { section, count: requests.length };
    }),
  );

  for (const result of settled) {
    if (result.status !== "fulfilled" || result.value.count === 0) continue;
    const clubId = result.value.section.club_id;
    if (clubId == null) continue;
    counts[clubId] = (counts[clubId] ?? 0) + result.value.count;
  }

  return counts;
}
