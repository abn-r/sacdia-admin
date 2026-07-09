import {
  resolveAdminTerritoryScope,
  type AdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";
import { getAdminUserDisplayName } from "@/lib/admin-users/display";
import {
  fetchClubsList,
  getClubListId,
  type ClubListItem,
} from "@/lib/clubs/fetch-list";
import { fetchPendingCountsByClubId } from "@/lib/dashboard/fetch-scoped-dashboard";
import { hasPermission } from "@/lib/auth/permission-utils";
import { CLUB_MEMBERS_APPROVE } from "@/lib/auth/permissions";
import {
  fetchLocalFieldDashboard,
  type LocalFieldDashboard,
} from "@/lib/api/local-field-dashboard";

export type CoordinatorLfClubCard = {
  clubId: number;
  name: string;
  active: boolean;
  activeSections: number;
  totalSections: number;
  pendingCount: number;
  localFieldName: string | null;
  districtName: string | null;
};

export type CoordinatorLfHomeData = {
  userName: string;
  scope: AdminTerritoryScope;
  scopeLabel: string;
  clubs: CoordinatorLfClubCard[];
  totalClubs: number;
  activeClubs: number;
  totalPending: number;
  canApproveMembers: boolean;
  fieldStats: LocalFieldDashboard | null;
};

function getClubCard(
  club: ClubListItem,
  pendingCounts: Record<number, number>,
): CoordinatorLfClubCard | null {
  const clubId = getClubListId(club);
  if (!clubId) return null;

  const sections = Array.isArray(club.club_sections) ? club.club_sections : [];
  const activeSections = sections.filter((s) => s.active !== false).length;

  return {
    clubId,
    name: club.name ?? "Club",
    active: club.active !== false,
    activeSections,
    totalSections: sections.length,
    pendingCount: pendingCounts[clubId] ?? 0,
    localFieldName: club.local_field?.name ?? club.local_fields?.name ?? null,
    districtName: club.district?.name ?? club.districts?.name ?? null,
  };
}

export async function fetchCoordinatorLfHomeData(
  user: AuthUser,
): Promise<CoordinatorLfHomeData> {
  const scope = resolveAdminTerritoryScope(user);
  const canApproveMembers = hasPermission(user, CLUB_MEMBERS_APPROVE);

  const [clubsResult, fieldStats] = await Promise.all([
    fetchClubsList({
      page: 1,
      limit: 100,
      active: true,
      ...(scope.level === "local_field"
        ? { localFieldId: scope.localFieldId }
        : {}),
    }),
    scope.level === "local_field"
      ? fetchLocalFieldDashboard(scope.localFieldId)
      : Promise.resolve(null),
  ]);

  const items = clubsResult.available ? clubsResult.items : [];
  const pendingCounts = canApproveMembers
    ? await fetchPendingCountsByClubId(user, items)
    : {};

  const clubs = items
    .map((club) => getClubCard(club, pendingCounts))
    .filter((card): card is CoordinatorLfClubCard => card !== null)
    .sort((a, b) => b.pendingCount - a.pendingCount || a.name.localeCompare(b.name));

  const totalPending = clubs.reduce((sum, club) => sum + club.pendingCount, 0);
  const activeClubs = clubs.filter((club) => club.active).length;

  const scopeLabel =
    scope.level === "local_field"
      ? (scope.localFieldName ?? "Campo local")
      : scope.level === "union"
        ? (scope.unionName ?? "Unión")
        : scope.level === "division"
          ? (scope.divisionName ?? "División")
          : "Global";

  const userName = getAdminUserDisplayName(user, {
    deletedAccount: "Usuario",
    fallback: user.email,
  });

  return {
    userName,
    scope,
    scopeLabel,
    clubs,
    totalClubs: clubsResult.available ? clubsResult.meta.total : clubs.length,
    activeClubs,
    totalPending,
    canApproveMembers,
    fieldStats,
  };
}
