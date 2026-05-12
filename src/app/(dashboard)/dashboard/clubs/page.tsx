import { Suspense } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { ClubsTableActionsCell } from "@/components/clubs/clubs-table-actions-cell";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permission-utils";
import { CLUBS_UPDATE, CLUBS_DELETE } from "@/lib/auth/permissions";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Club = {
  club_id?: number;
  id?: number;
  name?: string;
  active?: boolean;
  local_field_id?: number;
  district_id?: number;
  church_id?: number;
  local_field?: { name?: string } | null;
  district?: { name?: string } | null;
  church?: { name?: string } | null;
  [key: string]: unknown;
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ClubsResult = {
  items: Club[];
  meta: PaginationMeta;
  available: boolean;
  error?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): { page: number; limit: number } {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  const getPositiveInt = (key: string, fallback: number): number => {
    const v = getString(key);
    if (!v) return fallback;
    const parsed = Number(v);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };

  return {
    page: getPositiveInt("page", DEFAULT_PAGE),
    limit: getPositiveInt("limit", DEFAULT_LIMIT),
  };
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchClubs(query: {
  page: number;
  limit: number;
}): Promise<ClubsResult> {
  const fallbackMeta: PaginationMeta = {
    page: query.page,
    limit: query.limit,
    total: 0,
    totalPages: 1,
  };

  try {
    const payload = await apiRequest<unknown>(
      `/clubs?page=${query.page}&limit=${query.limit}`,
    );

    // Backend returns PaginatedResult<Club>: { data: Club[], meta: { page, limit, total, totalPages, ... } }
    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload)
    ) {
      const res = payload as {
        data?: unknown;
        meta?: {
          page?: number;
          limit?: number;
          total?: number;
          totalPages?: number;
        };
      };

      if (Array.isArray(res.data)) {
        const items = res.data as Club[];
        const meta: PaginationMeta = {
          page: res.meta?.page ?? query.page,
          limit: res.meta?.limit ?? query.limit,
          total: res.meta?.total ?? items.length,
          totalPages: res.meta?.totalPages ?? 1,
        };
        return { items, meta, available: true };
      }
    }

    // Graceful degradation: backend returned a plain array (no pagination)
    if (Array.isArray(payload)) {
      const items = payload as Club[];
      return {
        items,
        meta: {
          page: 1,
          limit: items.length || query.limit,
          total: items.length,
          totalPages: 1,
        },
        available: true,
      };
    }

    return { items: [], meta: fallbackMeta, available: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { items: [], meta: fallbackMeta, available: false, error: error.message };
    }
    return { items: [], meta: fallbackMeta, available: false, error: "Error inesperado" };
  }
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function ClubsContent({
  query,
}: {
  query: { page: number; limit: number };
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs.pages.list");
  const canCreate = hasPermission(user, "clubs:create");
  const canEdit = hasPermission(user, CLUBS_UPDATE);
  const canDelete = hasPermission(user, CLUBS_DELETE);
  const result = await fetchClubs(query);

  if (!result.available) {
    return (
      <div className="space-y-4">
        <EndpointErrorBanner state="missing" detail={result.error ?? t("endpointError")} />
        <EmptyState icon={Building2} title={t("cannotShow")} description={result.error} />
      </div>
    );
  }

  if (result.items.length === 0) {
    return (
      <EmptyState icon={Building2} title={t("emptyTitle")} description={t("emptyDescription")}>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/clubs/new">
              <Plus className="size-4" />
              {t("emptyCreateButton")}
            </Link>
          </Button>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop: full table */}
      <div className="hidden md:block">
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colName")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("colLocalField")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("colDistrict")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("colChurch")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                {(canEdit || canDelete) && (
                  <TableHead className="sticky right-0 z-20 w-[100px] border-l bg-background">
                    {t("colActions")}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((club) => {
                const clubId = club.club_id ?? club.id;
                return (
                  <TableRow key={clubId}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/clubs/${clubId}`}
                        className="hover:text-primary hover:underline underline-offset-4"
                      >
                        {club.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {club.local_field?.name ?? club.local_field_id ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {club.district?.name ?? club.district_id ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {club.church?.name ?? club.church_id ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={club.active !== false ? "soft-success" : "outline"} className="text-xs">
                        {club.active !== false ? t("statusActive") : t("statusInactive")}
                      </Badge>
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="sticky right-0 z-10 border-l bg-background">
                        <ClubsTableActionsCell
                          club={{ id: clubId ?? 0, name: club.name ?? "" }}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>

      {/* Mobile: descriptive cards */}
      <ul className="space-y-3 md:hidden" aria-label={t("mobileListLabel")}>
        {result.items.map((club) => {
          const clubId = club.club_id ?? club.id;
          const localField = club.local_field?.name ?? (club.local_field_id ? String(club.local_field_id) : null);
          const district = club.district?.name ?? (club.district_id ? String(club.district_id) : null);
          const church = club.church?.name ?? (club.church_id ? String(club.church_id) : null);

          return (
            <li key={clubId}>
              <Link
                href={`/dashboard/clubs/${clubId}`}
                className="block rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{club.name ?? "—"}</p>
                    {localField && (
                      <p className="truncate text-xs text-muted-foreground">{localField}</p>
                    )}
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant={club.active !== false ? "soft-success" : "outline"}
                    className="text-xs"
                  >
                    {club.active !== false ? t("statusActive") : t("statusInactive")}
                  </Badge>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {localField && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">{t("colLocalField")}</dt>
                      <dd className="truncate">{localField}</dd>
                    </div>
                  )}
                  {district && (
                    <div>
                      <dt className="text-muted-foreground">{t("colDistrict")}</dt>
                      <dd className="truncate">{district}</dd>
                    </div>
                  )}
                  {church && (
                    <div>
                      <dt className="text-muted-foreground">{t("colChurch")}</dt>
                      <dd className="truncate">{church}</dd>
                    </div>
                  )}
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>

      <DataTablePagination
        page={result.meta.page}
        totalPages={result.meta.totalPages}
        total={result.meta.total}
        limit={result.meta.limit}
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ClubsSkeleton() {
  return (
    <div className="space-y-4">
      <DataTableShell>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-5 w-14" />
          </div>
        ))}
      </DataTableShell>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("clubs.pages.list");
  const canCreate = hasPermission(user, "clubs:create");
  const rawParams = await searchParams;
  const query = parseSearchParams(rawParams);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/clubs/new">
              <Plus className="size-4" />
              {t("createButton")}
            </Link>
          </Button>
        )}
      </PageHeader>

      <Suspense fallback={<ClubsSkeleton />}>
        <ClubsContent query={query} />
      </Suspense>
    </div>
  );
}
