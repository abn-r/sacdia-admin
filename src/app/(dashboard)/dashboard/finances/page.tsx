import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DollarSign } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ClubContextBar } from "@/components/shared/club-context-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { FinancesDashboard } from "@/components/finances/finances-dashboard";
import { FinancesOverview } from "@/components/finances/finances-overview";
import { FinancesViewSwitcher } from "@/components/finances/finances-view-switcher";
import { getActiveEcclesiasticalYearId, listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { errorStateFromError } from "@/lib/api/error-state";
import type { LocalField } from "@/lib/api/geography";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { canAdminFilterByLocalField, listLocalFieldsForTerritory, resolveAdminTerritoryScope } from "@/lib/auth/territory-scope";
import { loadClubContextClubs } from "@/lib/club-context/load-clubs";
import { CLUB_CONTEXT_COOKIE, resolveClubContext } from "@/lib/club-context/scope";
import { canViewFinancesOverview } from "@/lib/finances/overview-access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("finances");
  return { title: t("page.title") };
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "finances")) {
    redirect("/dashboard");
  }
  const t = await getTranslations("finances");
  const search = await searchParams;
  const cookieStore = await cookies();
  const territoryScope = resolveAdminTerritoryScope(user);
  const isTerritoryRole = canViewFinancesOverview(user);

  const [clubTypes, localFields] = await Promise.all([
    listClubTypes().catch(() => []),
    canAdminFilterByLocalField(territoryScope)
      ? listLocalFieldsForTerritory(user).catch((): LocalField[] => [])
      : Promise.resolve<LocalField[]>([]),
  ]);
  const loaded = await loadClubContextClubs(clubTypes, localFields);

  if (!loaded.ok) {
    const { kind, detail } = errorStateFromError(loaded.error);
    return (
      <div className="space-y-6">
        <PageHeader title={t("page.title")} />
        <ErrorState kind={kind} detail={detail} retry />
      </div>
    );
  }

  const clubs = loaded.clubs;
  if (clubs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("page.title")} />
        <EmptyState
          icon={DollarSign}
          title={t("page.empty_no_clubs_title")}
          description={t("page.empty_no_clubs_description")}
        />
      </div>
    );
  }

  const { club, section } = resolveClubContext({
    clubs,
    searchParams: search,
    cookie: cookieStore.get(CLUB_CONTEXT_COOKIE)?.value ?? null,
  });
  // Club roles have one club: they go straight to it, with nothing to pick.
  const fixed = !isTerritoryRole && clubs.length === 1 && (club?.sections.length ?? 0) <= 1;
  const switcher = isTerritoryRole ? <FinancesViewSwitcher active="by-club" /> : undefined;

  const bar = (
    <ClubContextBar
      clubs={clubs}
      clubId={club?.club_id ?? null}
      sectionId={section?.club_section_id ?? null}
      fixed={fixed}
      allowAllSections
    />
  );

  if (club) {
    return (
      <div className="space-y-6">
        {bar}
        <FinancesDashboard
          key={club.club_id}
          clubId={club.club_id}
          clubName={club.name}
          sections={club.sections}
          sectionId={section?.club_section_id ?? "all"}
          switcher={switcher}
        />
      </div>
    );
  }

  if (isTerritoryRole) {
    const [years, activeYearId] = await Promise.all([
      listEcclesiasticalYears().catch(() => []),
      getActiveEcclesiasticalYearId().catch(() => null),
    ]);
    return (
      <div className="space-y-6">
        {bar}
        <FinancesOverview
          mode="clubs"
          localFields={localFields}
          showLocalFieldFilter={canAdminFilterByLocalField(territoryScope)}
          years={years}
          activeYearId={activeYearId}
          switcher={switcher}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bar}
      <PageHeader title={t("page.title")} />
      <EmptyState
        icon={DollarSign}
        title={t("clubSelector.emptyTitle")}
        description={t("clubSelector.emptyDescription")}
      />
    </div>
  );
}
