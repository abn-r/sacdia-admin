import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClubDetailView } from "@/components/clubs/detail/club-detail-view";
import { resolveClubDetailTab } from "@/components/clubs/detail/tab-utils";
import {
  listClubAnnualReports,
  listClubQuarterlyReports,
} from "@/lib/api/reports";
import { canCreateClubSections } from "@/lib/auth/permission-utils";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
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

  const canManageRoles = canCapability(user, "clubs", "manage_roles");
  const canCreateSections = canCreateClubSections(user);
  const canDesignate = canCapability(user, "clubs", "designate_director");
  const canSucceedDirector = canCapability(user, "clubs", "succeed_director");
  const canEnrollAnnualContinuations = canCapability(
    user,
    "annual_continuations",
    "enroll",
  );
  const detail = await loadClubDetail(id, {
    canManageRoles,
    canCreateSections,
    canDesignateNextDirector: canDesignate,
    canSucceedDirector,
    canEnrollAnnualContinuations,
  });
  if (!detail) notFound();

  // A failed fetch must not read as "this club has no reports": the tab shows an error instead.
  const [annualResult, quarterlyResult] = await Promise.allSettled([
    listClubAnnualReports(detail.clubId),
    listClubQuarterlyReports(detail.clubId),
  ]);
  if (annualResult.status === "rejected") {
    console.error("[ClubDetailPage] Failed to load annual reports:", annualResult.reason);
  }
  if (quarterlyResult.status === "rejected") {
    console.error("[ClubDetailPage] Failed to load quarterly reports:", quarterlyResult.reason);
  }

  return (
    <ClubDetailView
      data={detail}
      annualReports={annualResult.status === "fulfilled" ? annualResult.value : []}
      quarterlyReports={quarterlyResult.status === "fulfilled" ? quarterlyResult.value : []}
      annualReportsError={annualResult.status === "rejected"}
      quarterlyReportsError={quarterlyResult.status === "rejected"}
      canOpenReports={
        canViewScreen(user, "reports-annual") && canViewScreen(user, "reports-quarterly")
      }
      defaultTab={resolveClubDetailTab(tab)}
    />
  );
}
