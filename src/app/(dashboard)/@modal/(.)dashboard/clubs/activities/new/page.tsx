import { ActivityModal } from "@/components/activities/activity-modal";

export default async function NewActivityModal({
  searchParams,
}: {
  searchParams: Promise<{ club?: string | string[]; section?: string | string[] }>;
}) {
  return <ActivityModal searchParams={await searchParams} />;
}
