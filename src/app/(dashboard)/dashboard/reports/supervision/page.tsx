import { redirect } from "next/navigation";
import { legacyReportsRedirect } from "@/lib/reports/redirects";

/** Merged into /dashboard/reports: this URL keeps working and lands on the monthly view. */
export default async function LegacySupervisionRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(legacyReportsRedirect("monthly", await searchParams));
}
