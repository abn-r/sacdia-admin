import { redirect } from "next/navigation";
import { legacyReportsRedirect } from "@/lib/reports/redirects";

/** Merged into /dashboard/reports: this URL keeps working and lands on the annual view. */
export default async function LegacyAnnualRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyReportsRedirect("annual", await searchParams));
}
