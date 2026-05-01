import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { MemberRankingsFilters } from "./_components/member-rankings-filters";
import { MemberRankingsTable } from "./_components/member-rankings-table";
import { listMemberRankings, type MemberRankingsQuery } from "@/lib/api/member-rankings";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Constants ────────────────────────────────────────────────────────────────

// TODO: derive from active ecclesiastical year via API once endpoint is available
const DEFAULT_YEAR = 2026;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): MemberRankingsQuery {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  const getNumber = (key: string) => {
    const v = getString(key);
    return v ? Number(v) : undefined;
  };

  return {
    year_id: getNumber("year_id") ?? DEFAULT_YEAR,
    club_id: getNumber("club_id"),
    section_id: getNumber("section_id"),
    page: getNumber("page") ?? DEFAULT_PAGE,
    limit: getNumber("limit") ?? DEFAULT_LIMIT,
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MemberRankingsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-20" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b p-4 last:border-b-0"
          >
            <Skeleton className="h-4 w-8" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function MemberRankingsContent({ query }: { query: MemberRankingsQuery }) {
  const result = await listMemberRankings(query);

  if (!result.endpointAvailable) {
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={result.endpointState as "forbidden" | "missing" | "rate-limited"}
          detail={result.endpointDetail}
          showLoginLink={result.endpointState === "forbidden"}
        />
        <EmptyState
          icon={Trophy}
          title="No se pueden mostrar rankings"
          description={result.endpointDetail}
        />
      </div>
    );
  }

  return (
    <MemberRankingsTable
      data={result.items}
      total={result.total}
      page={result.page}
      limit={result.limit}
      totalPages={result.totalPages}
      selectedYearId={query.year_id ?? DEFAULT_YEAR}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MemberRankingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const rawParams = await searchParams;
  const query = parseSearchParams(rawParams);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ranking de miembros"
        description="Clasificación general por categoría con composite calculado."
      />

      <MemberRankingsFilters
        defaultYear={query.year_id}
        defaultClubId={query.club_id}
        defaultSectionId={query.section_id}
      />

      <Suspense fallback={<MemberRankingsTableSkeleton />}>
        <MemberRankingsContent query={query} />
      </Suspense>
    </div>
  );
}
