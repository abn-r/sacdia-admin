import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ActivitiesView } from "@/components/activities/activities-view";
import { ClubContextBar, ClubPickList } from "@/components/shared/club-context-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { listActivities } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import { listClubTypes } from "@/lib/api/catalogs";
import { errorStateFromError } from "@/lib/api/error-state";
import type { LocalField } from "@/lib/api/geography";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  canAdminFilterByLocalField,
  listLocalFieldsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import { loadClubContextClubs } from "@/lib/club-context/load-clubs";
import { CLUB_CONTEXT_COOKIE, resolveClubContext } from "@/lib/club-context/scope";
import { getFinanceSectionLabel } from "@/lib/finances/club-sections";
import { ACTIVITIES_BASE_PATH, extractArray, normalizeActivities } from "@/lib/activities/helpers";
import { activityPhase, todayKey } from "@/lib/activities/view";

/** The API caps a page at 100; a club has a few hundred activities a year at most. */
const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("activities.page");
  return { title: t("title") };
}

async function loadClubActivities(clubId: number, clubTypeId: number | undefined): Promise<Activity[]> {
  const all: Activity[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await listActivities(clubId, {
      page,
      limit: PAGE_LIMIT,
      active: true,
      ...(clubTypeId ? { clubTypeId } : {}),
    });
    all.push(...normalizeActivities(payload));
    const meta = (payload as { meta?: { hasNextPage?: boolean } } | null)?.meta;
    if (!meta?.hasNextPage || extractArray(payload).length < PAGE_LIMIT) break;
  }
  return all;
}

export default async function ClubActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "activities")) redirect("/dashboard");

  const t = await getTranslations("activities.page");
  const tp = await getTranslations("people.activities.page");
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
        <PageHeader title={t("title")} />
        <ErrorState kind={kind} detail={detail} description={t("error_load_clubs")} retry />
      </div>
    );
  }

  const clubs = loaded.clubs;
  if (clubs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} />
        <EmptyState
          icon={CalendarDays}
          title={t("empty_no_clubs_title")}
          description={t("empty_no_clubs_description")}
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
  const fixed = clubs.length === 1 && (club?.sections.length ?? 0) <= 1;
  const bar = (
    <ClubContextBar
      clubs={clubs}
      clubId={club?.club_id ?? null}
      sectionId={section?.club_section_id ?? null}
      fixed={fixed}
      allowAllSections
    />
  );

  // No club yet (territory roles): the clubs they can open, never an empty calendar.
  if (!club) {
    return (
      <div className="space-y-6">
        {bar}
        <PageHeader title={t("title")} description={tp("pickClub")} />
        <ClubPickList clubs={clubs} />
      </div>
    );
  }

  let activities: Activity[];
  try {
    activities = await loadClubActivities(club.club_id, section?.club_type_id);
  } catch (error) {
    const { kind, detail } = errorStateFromError(error);
    return (
      <div className="space-y-6">
        {bar}
        <PageHeader title={t("title")} />
        <ErrorState kind={kind} detail={detail} description={tp("errorLoad")} icon={CalendarDays} retry />
      </div>
    );
  }
  if (section) {
    activities = activities.filter((activity) => activity.club_section_id === section.club_section_id);
  }

  const today = todayKey();
  const upcoming = activities.filter((activity) => activityPhase(activity, today) !== "past").length;
  const canCreate = canCapability(user, "activities", "create");
  const canEdit = canCapability(user, "activities", "update");
  const sectionLabels = Object.fromEntries(
    club.sections.map((candidate) => [candidate.club_section_id, getFinanceSectionLabel(candidate)]),
  );
  const contextQuery = new URLSearchParams({ club: String(club.club_id) });
  if (section) contextQuery.set("section", String(section.club_section_id));

  return (
    <div className="space-y-6">
      {bar}
      <PageHeader
        title={t("title")}
        description={upcoming === 0 ? tp("findingNone") : tp("finding", { count: upcoming })}
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href={`${ACTIVITIES_BASE_PATH}/new?${contextQuery.toString()}`}>
                <Plus className="size-4" aria-hidden />
                {tp("new")}
              </Link>
            </Button>
          ) : null
        }
      />
      <ActivitiesView
        key={`${club.club_id}-${section?.club_section_id ?? "all"}`}
        activities={activities}
        today={today}
        sectionLabels={sectionLabels}
        canEdit={canEdit}
      />
    </div>
  );
}
