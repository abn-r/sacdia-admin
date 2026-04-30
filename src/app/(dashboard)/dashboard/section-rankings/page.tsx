import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { SectionRankingsFilters } from "./_components/section-rankings-filters";
import { SectionRankingsTable } from "./_components/section-rankings-table";
import {
  listSectionRankings,
  type SectionRankingsQuery,
} from "@/lib/api/section-rankings";
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
): SectionRankingsQuery & { year_id: number; page: number; limit: number } {
  const getString = (key: string) => {
    const v = raw[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  const getNumber = (key: string): number | undefined => {
    const v = getString(key);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  return {
    year_id: getNumber("year_id") ?? DEFAULT_YEAR,
    club_id: getNumber("club_id"),
    page: getNumber("page") ?? DEFAULT_PAGE,
    limit: getNumber("limit") ?? DEFAULT_LIMIT,
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SectionRankingsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-20" />
      </div>
      {/* Table skeleton — 7 columns */}
      <div className="rounded-xl border">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b p-4 last:border-b-0"
          >
            {/* rank */}
            <Skeleton className="h-4 w-8" />
            {/* section name */}
            <Skeleton className="h-4 w-36" />
            {/* composite badge */}
            <Skeleton className="h-5 w-16" />
            {/* member count */}
            <Skeleton className="h-4 w-10" />
            {/* category */}
            <Skeleton className="h-4 w-20" />
            {/* calculated at */}
            <Skeleton className="h-4 w-32" />
            {/* action */}
            <Skeleton className="h-8 w-28 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function SectionRankingsContent({
  query,
}: {
  query: SectionRankingsQuery & { year_id: number; page: number; limit: number };
}) {
  const result = await listSectionRankings(query);

  if (!result.endpointAvailable) {
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={
            result.endpointState as "forbidden" | "missing" | "rate-limited"
          }
          detail={result.endpointDetail ?? "Endpoint no disponible."}
          showLoginLink={result.endpointState === "forbidden"}
        />
        <EmptyState
          icon={BarChart3}
          title="No se pueden mostrar rankings de secciones"
          description={result.endpointDetail ?? "Endpoint no disponible."}
        />
      </div>
    );
  }

  return (
    <SectionRankingsTable
      data={result.items}
      total={result.total}
      page={result.page}
      limit={result.limit}
      totalPages={result.totalPages}
      yearId={query.year_id}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SectionRankingsPage({
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
        title="Ranking de secciones"
        description="Clasificación general de secciones por composite score."
      />

      <SectionRankingsFilters
        defaultYear={query.year_id}
        defaultClubId={query.club_id}
      />

      <Suspense fallback={<SectionRankingsTableSkeleton />}>
        <SectionRankingsContent query={query} />
      </Suspense>
    </div>
  );
}
