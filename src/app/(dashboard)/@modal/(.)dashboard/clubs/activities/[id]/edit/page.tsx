import { notFound } from "next/navigation";
import { ActivityModal } from "@/components/activities/activity-modal";

export default async function EditActivityModal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  const activityId = Number((await params).id);
  if (!Number.isInteger(activityId) || activityId <= 0) notFound();
  return <ActivityModal searchParams={await searchParams} activityId={activityId} />;
}
