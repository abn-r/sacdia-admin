import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/session";
import { apiRequest, ApiError } from "@/lib/api/client";
import { getSelectOptions } from "@/lib/catalogs/service";
import { updateClubAction, deleteClubAction } from "@/lib/clubs/actions";
import { ClubDetailView } from "@/components/clubs/detail/view";
import { resolveClubDetailRoute } from "@/components/clubs/detail/tab-utils";
import type { ClubFull } from "@/components/clubs/detail/types";
import { hasPermission } from "@/lib/auth/permission-utils";
import { CLUB_MEMBERS_APPROVE } from "@/lib/auth/permissions";
import { fetchPendingCountForClubSections } from "@/lib/dashboard/fetch-scoped-dashboard";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string; panel?: string }>;

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const { id } = await params;
  const { tab: tabParam, panel: panelParam } = await searchParams;

  let club: ClubFull;
  try {
    const payload = await apiRequest<unknown>(`/clubs/${id}`);
    const res = payload as { data?: ClubFull; status?: string } | ClubFull;
    club = ("data" in res && res.data && typeof res.data === "object"
      ? res.data
      : res) as ClubFull;
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

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

  const boundUpdateAction = updateClubAction.bind(null, clubId);

  const route = resolveClubDetailRoute(panelParam ?? tabParam);

  return (
    <ClubDetailView
      club={club}
      clubId={clubId}
      defaultTab={route.tab}
      defaultEditOpen={route.openEdit}
      pendingMembershipCount={pendingMembershipCount}
      localFieldOptions={localFields}
      districtOptions={districts}
      churchOptions={churches}
      clubTypeOptions={clubTypes}
      updateAction={boundUpdateAction}
      deleteAction={deleteClubAction}
    />
  );
}
