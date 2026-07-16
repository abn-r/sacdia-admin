import { ApiError } from "@/lib/api/client";
import {
  fetchOperationsDashboard,
  parseOperationsDashboardSearchParams,
} from "@/lib/api/operations-dashboard";
import { OperationsDashboardView } from "@/components/dashboard/operations-dashboard-view";
import { OperationsDashboardError } from "@/components/dashboard/operations-dashboard-error";
import { requireAdminUser } from "@/lib/auth/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();

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

  return <OperationsDashboardView data={data!} query={query} />;
}
