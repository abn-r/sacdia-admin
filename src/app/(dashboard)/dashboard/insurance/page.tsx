import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ClubContextBar, ClubPickList, SectionPickLinks } from "@/components/shared/club-context-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { InsuranceView } from "@/components/insurance/insurance-view";
import { listClubTypes } from "@/lib/api/catalogs";
import { errorStateFromError } from "@/lib/api/error-state";
import type { LocalField } from "@/lib/api/geography";
import { getSectionInsuranceOverview } from "@/lib/api/insurance";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  canAdminFilterByLocalField,
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { loadClubContextClubs } from "@/lib/club-context/load-clubs";
import { CLUB_CONTEXT_COOKIE, resolveClubContext } from "@/lib/club-context/scope";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("insurance");
  return { title: t("page.title") };
}

export default async function InsurancePage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "insurance-by-section")) {
    redirect("/dashboard");
  }
  const t = await getTranslations("insurance");
  const tc = await getTranslations("ops.club.insurance");
  const search = await searchParams;
  const cookieStore = await cookies();
  const territoryScope = resolveAdminTerritoryScope(user);

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
          icon={ShieldCheck}
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
  const bar = (
    <ClubContextBar
      clubs={clubs}
      clubId={club?.club_id ?? null}
      sectionId={section?.club_section_id ?? null}
      fixed={clubs.length === 1 && (club?.sections.length ?? 0) <= 1}
    />
  );

  if (!club || !section) {
    return (
      <div className="space-y-6">
        {bar}
        <PageHeader title={t("page.title")} description={t("page.description")} />
        {club ? (
          <EmptyState
            icon={ShieldCheck}
            title={tc("pickSection.title", { club: club.name })}
            description={tc("pickSection.description")}
          >
            <SectionPickLinks club={club} />
          </EmptyState>
        ) : (
          <ClubPickList clubs={clubs} />
        )}
      </div>
    );
  }

  let overview = null;
  try {
    overview = await getSectionInsuranceOverview(section.club_section_id);
  } catch (error) {
    const { kind, detail } = errorStateFromError(error);
    return (
      <div className="space-y-6">
        {bar}
        <PageHeader title={t("page.title")} description={t("page.description")} />
        <ErrorState kind={kind} detail={detail} description={t("view.load_error")} retry />
      </div>
    );
  }

  const description =
    overview?.year && overview.cycle
      ? tc("description", {
          uninsured: overview.counts.uninsured,
          total: overview.counts.total,
          covered: overview.counts.covered,
        })
      : t("page.description");

  return (
    <div className="space-y-6">
      {bar}
      <PageHeader title={t("page.title")} description={description} />
      {overview ? (
        <InsuranceView key={section.club_section_id} overview={overview} />
      ) : (
        <EmptyState icon={ShieldCheck} title={t("view.no_year_title")} description={t("view.no_year_description")} />
      )}
    </div>
  );
}
