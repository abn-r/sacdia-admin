import { redirect } from "next/navigation";
import { legacyReportsRedirect } from "@/lib/reports/redirects";

/** Merged into /dashboard/reports: this URL keeps working and lands on the quarterly view. */
export default async function LegacyQuarterlyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyReportsRedirect("quarterly", await searchParams));
}
