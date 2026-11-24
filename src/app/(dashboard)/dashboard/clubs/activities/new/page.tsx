import { ActivityModal } from "@/components/activities/activity-modal";
import { ACTIVITIES_BASE_PATH } from "@/lib/activities/helpers";
import ClubActivitiesPage from "../page";

type Search = { club?: string | string[]; section?: string | string[] };

function listHref(search: Search): string {
  const params = new URLSearchParams();
  const club = Array.isArray(search.club) ? search.club[0] : search.club;
  const section = Array.isArray(search.section) ? search.section[0] : search.section;
  if (club) params.set("club", club);
  if (club && section) params.set("section", section);
  const qs = params.toString();
  return qs ? `${ACTIVITIES_BASE_PATH}?${qs}` : ACTIVITIES_BASE_PATH;
}

/** Direct load of /clubs/activities/new: the list renders underneath, the form opens as the same modal. */
export default async function NewActivityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  return (
    <>
      <ClubActivitiesPage searchParams={Promise.resolve(search)} />
      <ActivityModal searchParams={search} dismissHref={listHref(search)} />
    </>
  );
}
