import { Suspense } from "react";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { PendingMembershipQueue } from "@/components/membership/pending-membership-queue";
import { UsersFilters } from "@/components/users/users-filters";
import { UsersToolbarActions } from "@/components/users/users-toolbar-actions";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { V2EndpointState } from "@/components/v2/shared/v2-endpoint-state";
import { V2UsersTable } from "@/components/v2/users/v2-users-table";
import { requireAdminUser } from "@/lib/auth/session";
import { canViewAdministrativeCompletion } from "@/lib/auth/permission-utils";
import {
  loadUsersList,
  parseUsersSearchParams,
} from "@/lib/v2/loaders/users";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function UsersListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

async function UsersContent({
  query,
}: {
  query: ReturnType<typeof parseUsersSearchParams>;
}) {
  const currentUser = await requireAdminUser();
  const t = await getTranslations("users.pages.list");
  const { result } = await loadUsersList(query, currentUser);
  const showAdministrativeCompletion = canViewAdministrativeCompletion(currentUser);
  const scope = result.meta?.scope;

  if (!result.endpointAvailable) {
    return (
      <V2EndpointState
        state={result.endpointState as "forbidden" | "missing" | "rate-limited"}
        detail={result.endpointDetail}
      >
        <UsersFilters scope={scope} />
        <EmptyState
          icon={Users}
          title={t("cannotShow")}
          description={result.endpointDetail}
        />
      </V2EndpointState>
    );
  }

  if (result.items.length === 0) {
    return <EmptyState icon={Users} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="space-y-4">
      <UsersFilters scope={scope} />
      <V2UsersTable users={result.items} />
      {result.meta ? (
        <DataTablePagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          total={result.meta.total}
          limit={result.meta.limit}
        />
      ) : null}
      {showAdministrativeCompletion ? null : null}
    </div>
  );
}

export default async function V2UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const t = await getTranslations("users.pages.list");
  const rawParams = await searchParams;
  const query = parseUsersSearchParams(rawParams);

  return (
    <div className="space-y-6">
      <V2PageShell
        title={t("title")}
        description={t("description")}
        actions={<UsersToolbarActions />}
        bleed
      >
        <Suspense fallback={null}>
          <PendingMembershipQueue />
        </Suspense>

        <Suspense fallback={<UsersListSkeleton />}>
          <UsersContent query={query} />
        </Suspense>
      </V2PageShell>
    </div>
  );
}
