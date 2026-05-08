import { getTranslations } from "next-intl/server";
import { BreakdownView } from "@/components/rankings/breakdown-view";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { requireAdminUser } from "@/lib/auth/session";
import { fetchRankingBreakdown } from "@/lib/api/annual-folders";
import { ApiError } from "@/lib/api/client";
import type { RankingBreakdown } from "@/lib/api/annual-folders";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ enrollmentId: string }>;
  searchParams: Promise<{ year_id?: string }>;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function BreakdownPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdminUser();
  const t = await getTranslations("annual_folders");

  const { enrollmentId } = await params;
  const { year_id } = await searchParams;
  const yearId = Number(year_id);

  if (!enrollmentId || !Number.isFinite(yearId) || yearId <= 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("pageRankingsBreakdown.paramsRequired")}
      </div>
    );
  }

  const [result] = await Promise.allSettled([
    fetchRankingBreakdown(enrollmentId, yearId),
  ]);

  const data: RankingBreakdown | null =
    result.status === "fulfilled" ? result.value : null;

  const loadError: string | null =
    result.status === "rejected"
      ? result.reason instanceof ApiError
        ? result.reason.message
        : t("pageRankingsBreakdown.errorFallback")
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageRankingsBreakdown.title")}
        description={t("pageRankingsBreakdown.description", { enrollmentId })}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {data && <BreakdownView data={data} />}
    </div>
  );
}
