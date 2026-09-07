import { redirect } from "next/navigation";
import {
  buildDashboardHref,
  parseOperationsDashboardSearchParams,
} from "@/lib/api/operations-dashboard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardV2RedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  redirect(buildDashboardHref(parseOperationsDashboardSearchParams(raw)));
}
