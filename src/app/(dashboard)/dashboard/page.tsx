import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/client";
import {
  fetchOperationsDashboard,
  parseOperationsDashboardSearchParams,
} from "@/lib/api/operations-dashboard";
import { OperationsDashboardView } from "@/components/dashboard/operations-dashboard-view";
import { OperationsDashboardError } from "@/components/dashboard/operations-dashboard-error";
import { isPastorOnlyUser, PASTOR_LANDING_PATH } from "@/lib/auth/roles";
import { requireAdminUser } from "@/lib/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();

  // Pastors (and nothing else) land on the authorization screen: it is the only
  // thing they can open for now.
  if (isPastorOnlyUser(user)) {
    redirect(PASTOR_LANDING_PATH);
  }

  const raw = await searchParams;
  const query = parseOperationsDashboardSearchParams(raw);

  let apiError: ApiError | null = null;
  let data = null;

  try {
    data = await fetchOperationsDashboard(query);
  } catch (error) {
    if (error instanceof ApiError) {
      apiError = error;
    } else {
      throw error;
    }
  }

  if (apiError) {
    return <OperationsDashboardError error={apiError} />;
  }

  return <OperationsDashboardView data={data!} query={query} user={user} />;
}
