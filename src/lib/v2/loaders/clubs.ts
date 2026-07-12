import { apiRequest } from "@/lib/api/client";
import { getSelectOptions } from "@/lib/catalogs/service";
import { updateClubAction, deleteClubAction } from "@/lib/clubs/actions";
import { fetchClubsList } from "@/lib/clubs/fetch-list";
import type { ClubFull } from "@/components/clubs/detail/types";
import {
  canManageClubsByRole,
  hasPermission,
} from "@/lib/auth/permission-utils";
import { CLUB_MEMBERS_APPROVE, CLUBS_UPDATE } from "@/lib/auth/permissions";
import {
  fetchPendingCountForClubSections,
  fetchPendingCountsByClubId,
} from "@/lib/dashboard/fetch-scoped-dashboard";
import { readParam, readPositiveNumberParam } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { AuthUser } from "@/lib/auth/types";

export function parseClubsSearchParams(
  raw: Record<string, string | string[] | undefined>,
) {
  const page = readPositiveNumberParam(raw, "page") ?? 1;
  const limit = readPositiveNumberParam(raw, "limit") ?? 20;
  const search =
    readParam(raw, "search") ?? readParam(raw, "name") ?? readParam(raw, "q");
  const activeRaw = readParam(raw, "active");
  const localFieldRaw = readParam(raw, "localFieldId");

  const active =
    activeRaw === "true" ? true : activeRaw === "false" ? false : undefined;
  const localFieldId = localFieldRaw ? Number(localFieldRaw) : undefined;

  return {
    page,
    limit,
    search,
    active,
    localFieldId:
      localFieldId && Number.isFinite(localFieldId) ? localFieldId : undefined,
  };
}

export function parseClubDetailSearchParams(
  raw: Record<string, string | string[] | undefined>,
) {
  const tab = typeof raw.tab === "string" ? raw.tab : undefined;
  const panel = typeof raw.panel === "string" ? raw.panel : undefined;
  return { tab, panel };
}

export async function loadClubDetail(id: string, user: AuthUser) {
  const payload = await apiRequest<unknown>(`/clubs/${id}`);
  const res = payload as { data?: ClubFull; status?: string } | ClubFull;
  const club = (
    "data" in res && res.data && typeof res.data === "object" ? res.data : res
  ) as ClubFull;

  const clubId = Number(club.club_id ?? club.id ?? id);
  const sectionIds = (club.club_sections ?? club.sections ?? [])
    .map((section) => section.club_section_id)
    .filter((value): value is number => typeof value === "number");

  const pendingMembershipCount = hasPermission(user, CLUB_MEMBERS_APPROVE)
    ? await fetchPendingCountForClubSections(sectionIds)
    : 0;

  const [localFields, districts, churches, clubTypes] = await Promise.all([
    getSelectOptions("local-fields").catch(() => []),
    getSelectOptions("districts").catch(() => []),
    getSelectOptions("churches").catch(() => []),
    getSelectOptions("club-types").catch(() => []),
  ]);

  return {
    club,
    clubId,
    pendingMembershipCount,
    localFieldOptions: localFields,
    districtOptions: districts,
    churchOptions: churches,
    clubTypeOptions: clubTypes,
    updateAction: updateClubAction.bind(null, clubId),
    deleteAction: deleteClubAction,
  };
}

export async function loadClubsList(
  raw: Record<string, string | string[] | undefined>,
  user: AuthUser,
) {
  const query = parseClubsSearchParams(raw);
  const result = await fetchClubsList(query);
  const localFieldOptions = await getSelectOptions("local-fields").catch(() => []);
  const canCreate =
    hasPermission(user, "clubs:create") && canManageClubsByRole(user);
  const canEdit = hasPermission(user, CLUBS_UPDATE);
  const pendingCountsByClubId = result.available
    ? await fetchPendingCountsByClubId(user, result.items)
    : {};

  return {
    query,
    result,
    localFieldOptions,
    canCreate,
    canEdit,
    pendingCountsByClubId,
    user,
  };
}
