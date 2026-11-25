import { redirect } from "next/navigation";

type SearchParams = Promise<{ year_id?: string }>;

/** Members now open in a sheet inside the list; old links land on the list, once. */
export default async function LegacySectionMembersPage({ searchParams }: { searchParams: SearchParams }) {
  const { year_id } = await searchParams;
  const yearId = Number(year_id);
  redirect(
    Number.isInteger(yearId) && yearId > 0
      ? `/dashboard/section-rankings?year_id=${yearId}`
      : "/dashboard/section-rankings",
  );
}
