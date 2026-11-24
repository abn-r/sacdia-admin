import { redirect } from "next/navigation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Categories now live as a tab of the resources page. Old links and bookmarks
 * keep working: this route forwards to `/resources?tab=categories`, carrying
 * over the list params it used to read.
 */
export default async function ResourceCategoriesRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams({ tab: "categories" });
  for (const key of ["page", "limit", "search", "active"]) {
    const value = raw[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }
  redirect(`/dashboard/resources?${params.toString()}`);
}
