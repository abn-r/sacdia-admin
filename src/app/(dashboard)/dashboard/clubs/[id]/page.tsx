import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ClubDetailView } from "@/components/clubs/detail/club-detail-view";
import {
  listClubAnnualReports,
  listClubQuarterlyReports,
} from "@/lib/api/reports";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { listEcclesiasticalYears } from "@/lib/api/catalogs";
import { resolveYearLabel } from "@/lib/clubs/detail-year";
import { resolveClubDetailTab } from "@/lib/clubs/detail-tabs";
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
  // The old "Roles y clases" tab became positions inside each section.
  if (tab === "roles") redirect(`/dashboard/clubs/${id}?tab=sections`);

  const canManageRoles = canCapability(user, "clubs", "manage_roles");
  const canCreateSections = canCapability(user, "clubs", "sections.create");
  const canDesignate = canCapability(user, "clubs", "designate_director");
  const canSucceedDirector = canCapability(user, "clubs", "succeed_director");
  const canEdit = canCapability(user, "clubs", "update");
  const canRevokeRoles = canCapability(user, "clubs", "revoke_roles");
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
  // Coordinators cannot see quarterly / annual reports (capability reports.view_periodic):
  // skip the requests (they would answer 403) and hide those sections.
  const canViewPeriodicReports =
    canViewScreen(user, "reports-annual") && canViewScreen(user, "reports-quarterly");
  const [annualResult, quarterlyResult] = canViewPeriodicReports
    ? await Promise.allSettled([
        listClubAnnualReports(detail.clubId),
        listClubQuarterlyReports(detail.clubId),
      ])
    : [
        { status: "fulfilled" as const, value: [] },
        { status: "fulfilled" as const, value: [] },
      ];
  if (annualResult.status === "rejected") {
    console.error("[ClubDetailPage] Failed to load annual reports:", annualResult.reason);
  }
  if (quarterlyResult.status === "rejected") {
    console.error("[ClubDetailPage] Failed to load quarterly reports:", quarterlyResult.reason);
  }

  // People read years ("2027"), never ids: the director designation and the
  // annual enrollment target the next year, positions the one in force.
  const years = await listEcclesiasticalYears().catch((error) => {
    console.error("[ClubDetailPage] Failed to load ecclesiastical years:", error);
    return [];
  });
  const yearLabels = {
    current: resolveYearLabel(years, detail.currentYearId),
    next: resolveYearLabel(years, detail.nextYearId),
  };

  return (
    <ClubDetailView
      data={detail}
      annualReports={annualResult.status === "fulfilled" ? annualResult.value : []}
      quarterlyReports={quarterlyResult.status === "fulfilled" ? quarterlyResult.value : []}
      annualReportsError={annualResult.status === "rejected"}
      quarterlyReportsError={quarterlyResult.status === "rejected"}
      canViewPeriodicReports={canViewPeriodicReports}
      canOpenReports={canViewPeriodicReports}
      canEdit={canEdit}
      canRevokeRoles={canRevokeRoles}
      yearLabels={yearLabels}
      defaultTab={resolveClubDetailTab(tab)}
    />
  );
}
