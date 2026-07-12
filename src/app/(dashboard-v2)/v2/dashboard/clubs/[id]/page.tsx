import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { ClubDetailView } from "@/components/clubs/detail/view";
import { resolveClubDetailRoute } from "@/components/clubs/detail/tab-utils";
import { loadClubDetail, parseClubDetailSearchParams } from "@/lib/v2/loaders/clubs";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string; panel?: string }>;

export default async function V2ClubDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const { id } = await params;
  const rawSearch = await searchParams;
  const { tab: tabParam, panel: panelParam } = parseClubDetailSearchParams(rawSearch);

  let detail;
  try {
    detail = await loadClubDetail(id, user);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  const route = resolveClubDetailRoute(panelParam ?? tabParam);

  return (
    <ClubDetailView
      club={detail.club}
      clubId={detail.clubId}
      defaultTab={route.tab}
      defaultEditOpen={route.openEdit}
      pendingMembershipCount={detail.pendingMembershipCount}
      localFieldOptions={detail.localFieldOptions}
      districtOptions={detail.districtOptions}
      churchOptions={detail.churchOptions}
      clubTypeOptions={detail.clubTypeOptions}
      updateAction={detail.updateAction}
      deleteAction={detail.deleteAction}
    />
  );
}
