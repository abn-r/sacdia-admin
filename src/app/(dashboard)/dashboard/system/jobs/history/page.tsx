import { redirect } from "next/navigation";
import { legacyHistoryHref } from "@/lib/system/system-view";

/** Old history route (email links, bookmarks): now the History tab of Sistema. */
export default async function LegacyCronHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyHistoryHref(await searchParams));
}
