import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { BreakdownView } from "@/components/rankings/breakdown-view";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadAnnualFoldersRankingBreakdown } from "@/lib/v2/loaders/annual-folders";

type PageProps = {
  params: Promise<{ enrollmentId: string }>;
  searchParams: Promise<{ year_id?: string }>;
};

function BreakdownSkeleton() {
  return <Skeleton className="h-72 w-full rounded-xl" />;
}

async function BreakdownContent({
  enrollmentId,
  yearId,
}: {
  enrollmentId: string;
  yearId: number;
}) {
  const t = await getTranslations("annual_folders");
  const { data, error } = await loadAnnualFoldersRankingBreakdown(
    enrollmentId,
    yearId,
  );

  if (error) {
    return (
      <EndpointErrorBanner
        state={error.status === 403 ? "forbidden" : "missing"}
        detail={error.message || t("pageRankingsBreakdown.errorFallback")}
      />
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("pageRankingsBreakdown.errorFallback")}
      </p>
    );
  }

  return <BreakdownView data={data} />;
}

export default async function V2RankingBreakdownPage({
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
      <V2PageShell title={t("pageRankingsBreakdown.title")} bleed>
        <p className="text-sm text-muted-foreground">
          {t("pageRankingsBreakdown.paramsRequired")}
        </p>
      </V2PageShell>
    );
  }

  return (
    <V2PageShell
      title={t("pageRankingsBreakdown.title")}
      description={t("pageRankingsBreakdown.description", { enrollmentId })}
      bleed
    >
      <Suspense fallback={<BreakdownSkeleton />}>
        <BreakdownContent enrollmentId={enrollmentId} yearId={yearId} />
      </Suspense>
    </V2PageShell>
  );
}
