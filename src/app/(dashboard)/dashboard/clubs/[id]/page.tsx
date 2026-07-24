import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClubDetailView } from "@/components/clubs/detail/club-detail-view";
import { resolveClubDetailTab } from "@/components/clubs/detail/tab-utils";
import {
  listClubAnnualReports,
  listClubQuarterlyReports,
} from "@/lib/api/reports";
import { canCreateClubSections, hasAnyPermission } from "@/lib/auth/permission-utils";
import { CLUB_ROLES_ASSIGN } from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import { loadClubDetail } from "@/lib/clubs/fetch-detail";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const t = await getTranslations("clubs.detail");
  const detail = await loadClubDetail(id).catch(() => null);
  return {
    title: detail?.club.name ?? t("fallbackTitle"),
  };
}

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const { id } = await params;
  const { tab } = await searchParams;

  const canManageRoles = hasAnyPermission(user, [CLUB_ROLES_ASSIGN]);
  const canCreateSections = canCreateClubSections(user);
  const detail = await loadClubDetail(id, { canManageRoles, canCreateSections });
  if (!detail) notFound();

  const [annualReports, quarterlyReports] = await Promise.all([
    listClubAnnualReports(detail.clubId).catch(() => []),
    listClubQuarterlyReports(detail.clubId).catch(() => []),
  ]);

  return (
    <ClubDetailView
      data={detail}
      annualReports={annualReports}
      quarterlyReports={quarterlyReports}
      defaultTab={resolveClubDetailTab(tab)}
    />
  );
}
