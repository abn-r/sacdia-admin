import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState, type ErrorStateKind } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { resolveYearLabelById } from "@/lib/annual-folders/ecclesiastical-year-label";
import { getActiveEcclesiasticalYearId, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { getClubById } from "@/lib/api/clubs";
import { listSectionRankings, type SectionRankingsQuery } from "@/lib/api/section-rankings";
import { requireAdminUser } from "@/lib/auth/session";
import { SectionProgressFilters } from "./_components/section-progress-filters";
import { SectionRankingsTable } from "./_components/section-rankings-table";

const DEFAULT_LIMIT = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Query = SectionRankingsQuery & { year_id: number; page: number; limit: number };

function parseSearchParams(raw: Record<string, string | string[] | undefined>, fallbackYearId: number): Query {
  const getNumber = (key: string): number | undefined => {
    const v = raw[key];
    if (typeof v !== "string" || !v.trim()) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  return {
    year_id: getNumber("year_id") ?? fallbackYearId,
    club_id: getNumber("club_id"),
    page: getNumber("page") ?? 1,
    limit: getNumber("limit") ?? DEFAULT_LIMIT,
  };
}

const ENDPOINT_KIND: Record<string, ErrorStateKind> = {
  forbidden: "forbidden",
  "rate-limited": "rateLimited",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("evaluation.progress.section");
  return { title: t("title") };
}

export default async function SectionProgressPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminUser();
  const t = await getTranslations("evaluation.progress.section");
  const rawParams = await searchParams;
  const fallbackYearId = await getActiveEcclesiasticalYearId();

  if (fallbackYearId === null) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <EmptyState icon={BarChart3} title={t("noYearTitle")} description={t("noYearDescription")} />
      </div>
    );
  }

  const query = parseSearchParams(rawParams, fallbackYearId);
  const [result, years, clubName] = await Promise.all([
    listSectionRankings(query),
    listEcclesiasticalYears().catch(() => []),
    query.club_id
      ? getClubById(query.club_id)
          .then((club) => {
            const c = club as { data?: { name?: unknown }; name?: unknown } | null;
            const value = c?.data?.name ?? c?.name;
            return typeof value === "string" ? value : null;
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const yearLabel = resolveYearLabelById(years, query.year_id) ?? undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={yearLabel ? t("descriptionYear", { year: yearLabel }) : t("description")}
      />
      <SectionProgressFilters yearId={query.year_id} clubId={query.club_id} />

      {!result.endpointAvailable ? (
        <ErrorState kind={ENDPOINT_KIND[result.endpointState] ?? "error"} retry />
      ) : (
        <SectionRankingsTable
          data={result.items}
          total={result.total}
          page={result.page}
          limit={result.limit}
          totalPages={result.totalPages}
          yearId={query.year_id}
          yearLabel={yearLabel}
          filtered={query.club_id !== undefined}
          fallbackClubName={clubName}
        />
      )}
    </div>
  );
}
