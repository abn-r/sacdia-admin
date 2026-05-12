import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/session";
import { apiRequest, ApiError } from "@/lib/api/client";
import { getSelectOptions } from "@/lib/catalogs/service";
import { updateClubAction, deleteClubAction } from "@/lib/clubs/actions";
import { ClubDetailView } from "@/components/clubs/detail/view";
import { resolveTabFromString } from "@/components/clubs/detail/tab-utils";
import type { ClubFull } from "@/components/clubs/detail/types";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string }>;

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const { id } = await params;
  const { tab: tabParam } = await searchParams;

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

  const [localFields, districts, churches] = await Promise.all([
    getSelectOptions("local-fields").catch(() => []),
    getSelectOptions("districts").catch(() => []),
    getSelectOptions("churches").catch(() => []),
  ]);

  const boundUpdateAction = updateClubAction.bind(null, clubId);

  return (
    <ClubDetailView
      club={club}
      clubId={clubId}
      defaultTab={resolveTabFromString(tabParam)}
      localFieldOptions={localFields}
      districtOptions={districts}
      churchOptions={churches}
      updateAction={boundUpdateAction}
      deleteAction={deleteClubAction}
    />
  );
}
