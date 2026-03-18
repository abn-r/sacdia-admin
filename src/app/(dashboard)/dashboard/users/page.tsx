import { Suspense } from "react";
import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { UsersFilters } from "@/components/users/users-filters";
import { UsersTable } from "@/components/users/users-table";
import { listAdminUsers, type AdminUsersQuery } from "@/lib/api/admin-users";
import { requireAdminUser } from "@/lib/auth/session";
import { canViewAdministrativeCompletion } from "@/lib/auth/permission-utils";
import type { AuthUser } from "@/lib/auth/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseSearchParams(raw: Record<string, string | string[] | undefined>): AdminUsersQuery {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" ? v : undefined;
  };
  const getNumber = (key: string) => {
    const v = getString(key);
    return v ? Number(v) : undefined;
  };

  return {
    search: getString("search"),
    role: getString("role"),
    active: getString("active") === "true" ? true : getString("active") === "false" ? false : undefined,
    unionId: getNumber("unionId"),
    localFieldId: getNumber("localFieldId"),
    page: getNumber("page") || 1,
    limit: getNumber("limit") || 20,
  };
}

async function UsersContent({
  query,
  currentUser,
}: {
  query: AdminUsersQuery;
  currentUser: AuthUser;
}) {
  const result = await listAdminUsers(query);
  const showAdministrativeCompletion = canViewAdministrativeCompletion(currentUser);

  if (!result.endpointAvailable) {
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={result.endpointState as "forbidden" | "missing" | "rate-limited"}
          detail={result.endpointDetail}
          showLoginLink={result.endpointState === "forbidden"}
        />
        <EmptyState
          icon={Users}
          title="No se pueden mostrar usuarios"
          description={result.endpointDetail}
        />
      </div>
    );
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No se encontraron usuarios"
        description="Intenta ajustar los filtros de búsqueda."
      />
    );
  }

  const meta = result.meta;

  return (
    <div className="space-y-4">
      <UsersTable
        users={result.items}
        showAdministrativeCompletion={showAdministrativeCompletion}
      />
      {meta && (
        <DataTablePagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
        />
      )}
    </div>
  );
}

function UsersListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[140px]" />
      </div>
      <div className="rounded-md border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="hidden h-5 w-16 md:block" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const currentUser = await requireAdminUser();
  const rawParams = await searchParams;
  const query = parseSearchParams(rawParams);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios del sistema."
      />

      <Suspense fallback={<UsersListSkeleton />}>
        <UsersFilters />
        <UsersContent query={query} currentUser={currentUser} />
      </Suspense>
    </div>
  );
}
