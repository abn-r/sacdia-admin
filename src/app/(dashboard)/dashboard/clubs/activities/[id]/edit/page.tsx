import { notFound } from "next/navigation";
import { ActivityModal } from "@/components/activities/activity-modal";
import { activityDetailPath } from "@/lib/activities/helpers";
import ActivityDetailPage from "../page";

type Search = { club?: string | string[]; section?: string | string[] };

/** Direct load of /clubs/activities/[id]/edit: the detail renders underneath, the form opens as the same modal. */
export default async function EditActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const activityId = Number(id);
  if (!Number.isInteger(activityId) || activityId <= 0) notFound();
  const search = await searchParams;
  return (
    <>
      <ActivityDetailPage params={Promise.resolve({ id })} />
      <ActivityModal searchParams={search} activityId={activityId} dismissHref={activityDetailPath(activityId)} />
    </>
  );
}
